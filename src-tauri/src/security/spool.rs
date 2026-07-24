use std::{
    fs::{File, OpenOptions},
    io::{Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
};

use aes_gcm::{
    Aes256Gcm, Nonce,
    aead::{Aead, KeyInit, Payload},
};
use chrono::Utc;
use rand::random;

use crate::error::{RecorderError, RecorderResult};

const MAGIC: &[u8; 4] = b"ARRS";
const FRAME_VERSION: u16 = 1;
const HEADER_LENGTH: usize = 30;
const MAX_FRAME_LENGTH: usize = 1_048_576;
const MAX_SPOOL_BYTES: u64 = 256 * 1024 * 1024;

#[derive(Clone)]
pub struct EncryptedSpool {
    directory: PathBuf,
    key: [u8; 32],
}

#[derive(Debug, Default, PartialEq, Eq)]
pub struct SpoolRecovery {
    pub records: Vec<Vec<u8>>,
    pub truncated_bytes: u64,
    pub quarantined: bool,
}

impl EncryptedSpool {
    pub fn new(directory: PathBuf, key: [u8; 32]) -> RecorderResult<Self> {
        std::fs::create_dir_all(&directory)?;
        Ok(Self { directory, key })
    }

    pub fn append(&self, producer_id: &str, ordinal: u64, plaintext: &[u8]) -> RecorderResult<()> {
        validate_producer_id(producer_id)?;
        let path = self.segment_path(producer_id);
        let frame = self.encrypt_frame(producer_id, ordinal, plaintext)?;
        if self.bytes_used()?.saturating_add(frame.len() as u64) > MAX_SPOOL_BYTES {
            return Err(RecorderError::Ingestion(
                "encrypted spool capacity reached".into(),
            ));
        }
        let mut file = OpenOptions::new().create(true).append(true).open(path)?;
        file.write_all(&frame)?;
        file.sync_data()?;
        Ok(())
    }

    pub fn recover(&self, producer_id: &str) -> RecorderResult<SpoolRecovery> {
        validate_producer_id(producer_id)?;
        let path = self.segment_path(producer_id);
        if !path.exists() {
            return Ok(SpoolRecovery::default());
        }
        self.recover_file(&path, producer_id)
    }

    pub fn clear(&self, producer_id: &str) -> RecorderResult<()> {
        validate_producer_id(producer_id)?;
        let path = self.segment_path(producer_id);
        if !path.exists() {
            return Ok(());
        }
        let file = OpenOptions::new().write(true).open(path)?;
        file.set_len(0)?;
        file.sync_data()?;
        Ok(())
    }

    pub fn bytes_used(&self) -> RecorderResult<u64> {
        let mut total = 0_u64;
        for entry in std::fs::read_dir(&self.directory)? {
            let entry = entry?;
            if entry.file_type()?.is_file() {
                total = total.saturating_add(entry.metadata()?.len());
            }
        }
        Ok(total)
    }

    pub fn capacity_bytes(&self) -> u64 {
        MAX_SPOOL_BYTES
    }

    fn encrypt_frame(
        &self,
        producer_id: &str,
        ordinal: u64,
        plaintext: &[u8],
    ) -> RecorderResult<Vec<u8>> {
        if plaintext.len() > MAX_FRAME_LENGTH {
            return Err(RecorderError::InvalidInput("spool frame too large".into()));
        }
        let nonce_bytes = random::<[u8; 12]>();
        let aad = frame_aad(producer_id, ordinal);
        let cipher = Aes256Gcm::new_from_slice(&self.key).map_err(|_| RecorderError::Crypto)?;
        let nonce = Nonce::try_from(nonce_bytes.as_slice()).map_err(|_| RecorderError::Crypto)?;
        let ciphertext = cipher
            .encrypt(
                &nonce,
                Payload {
                    msg: plaintext,
                    aad: &aad,
                },
            )
            .map_err(|_| RecorderError::Crypto)?;
        encode_frame(ordinal, nonce_bytes, ciphertext)
    }

    fn recover_file(&self, path: &Path, producer_id: &str) -> RecorderResult<SpoolRecovery> {
        let mut file = OpenOptions::new().read(true).write(true).open(path)?;
        let original_length = file.metadata()?.len();
        let mut recovery = SpoolRecovery::default();
        let mut valid_length = 0_u64;

        while valid_length < original_length {
            match self.read_frame(&mut file, producer_id) {
                Ok(Some(record)) => {
                    valid_length = file.stream_position()?;
                    recovery.records.push(record);
                }
                Ok(None) => break,
                Err(_) => {
                    recovery.quarantined = true;
                    quarantine_tail(path, &mut file, valid_length)?;
                    break;
                }
            }
        }

        recovery.truncated_bytes = original_length.saturating_sub(valid_length);
        if recovery.truncated_bytes > 0 {
            file.set_len(valid_length)?;
            file.sync_data()?;
        }
        Ok(recovery)
    }

    fn read_frame(&self, file: &mut File, producer_id: &str) -> RecorderResult<Option<Vec<u8>>> {
        let mut header = [0_u8; HEADER_LENGTH];
        let read = file.read(&mut header)?;
        if read == 0 {
            return Ok(None);
        }
        if read != HEADER_LENGTH || &header[0..4] != MAGIC {
            return Err(RecorderError::Crypto);
        }
        decode_frame(&self.key, producer_id, &header, file).map(Some)
    }

    fn segment_path(&self, producer_id: &str) -> PathBuf {
        self.directory.join(format!("{producer_id}.segment"))
    }
}

fn encode_frame(ordinal: u64, nonce: [u8; 12], ciphertext: Vec<u8>) -> RecorderResult<Vec<u8>> {
    let length = u32::try_from(ciphertext.len())
        .map_err(|_| RecorderError::InvalidInput("spool frame too large".into()))?;
    let mut frame = Vec::with_capacity(HEADER_LENGTH + ciphertext.len());
    frame.extend_from_slice(MAGIC);
    frame.extend_from_slice(&FRAME_VERSION.to_be_bytes());
    frame.extend_from_slice(&ordinal.to_be_bytes());
    frame.extend_from_slice(&nonce);
    frame.extend_from_slice(&length.to_be_bytes());
    frame.extend_from_slice(&ciphertext);
    Ok(frame)
}

fn decode_frame(
    key: &[u8; 32],
    producer_id: &str,
    header: &[u8; HEADER_LENGTH],
    file: &mut File,
) -> RecorderResult<Vec<u8>> {
    let version = u16::from_be_bytes([header[4], header[5]]);
    if version != FRAME_VERSION {
        return Err(RecorderError::Crypto);
    }
    let ordinal = u64::from_be_bytes(
        header[6..14]
            .try_into()
            .map_err(|_| RecorderError::Crypto)?,
    );
    let length = u32::from_be_bytes(
        header[26..30]
            .try_into()
            .map_err(|_| RecorderError::Crypto)?,
    );
    if length as usize > MAX_FRAME_LENGTH + 16 {
        return Err(RecorderError::Crypto);
    }
    let mut ciphertext = vec![0_u8; length as usize];
    file.read_exact(&mut ciphertext)
        .map_err(|_| RecorderError::Crypto)?;
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| RecorderError::Crypto)?;
    let nonce = Nonce::try_from(&header[14..26]).map_err(|_| RecorderError::Crypto)?;
    cipher
        .decrypt(
            &nonce,
            Payload {
                msg: &ciphertext,
                aad: &frame_aad(producer_id, ordinal),
            },
        )
        .map_err(|_| RecorderError::Crypto)
}

fn frame_aad(producer_id: &str, ordinal: u64) -> Vec<u8> {
    let mut aad = Vec::with_capacity(producer_id.len() + 10);
    aad.extend_from_slice(&FRAME_VERSION.to_be_bytes());
    aad.extend_from_slice(&ordinal.to_be_bytes());
    aad.extend_from_slice(producer_id.as_bytes());
    aad
}

fn validate_producer_id(producer_id: &str) -> RecorderResult<()> {
    let valid = !producer_id.is_empty()
        && producer_id.len() <= 64
        && producer_id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'));
    if valid {
        Ok(())
    } else {
        Err(RecorderError::InvalidInput("invalid producer id".into()))
    }
}

fn quarantine_tail(path: &Path, file: &mut File, offset: u64) -> RecorderResult<()> {
    file.seek(SeekFrom::Start(offset))?;
    let mut tail = Vec::new();
    file.read_to_end(&mut tail)?;
    if tail.is_empty() {
        return Ok(());
    }
    let timestamp = Utc::now().timestamp_millis();
    let quarantine = path.with_extension(format!("quarantine-{timestamp}"));
    let mut output = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(quarantine)?;
    output.write_all(&tail)?;
    output.sync_data()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::io::{Seek, SeekFrom, Write};

    use tempfile::tempdir;

    use super::EncryptedSpool;

    #[test]
    fn encrypts_and_recovers_frames() {
        let directory = tempdir().expect("tempdir");
        let spool = EncryptedSpool::new(directory.path().to_path_buf(), [9_u8; 32]).expect("spool");
        spool
            .append("codex", 1, br#"{"safe":true}"#)
            .expect("append");

        let raw = std::fs::read(directory.path().join("codex.segment")).expect("read segment");
        assert!(!raw.windows(4).any(|window| window == b"safe"));
        let recovery = spool.recover("codex").expect("recover");
        assert_eq!(recovery.records, vec![br#"{"safe":true}"#.to_vec()]);
        assert_eq!(recovery.truncated_bytes, 0);
    }

    #[test]
    fn truncates_and_quarantines_corrupt_tail() {
        let directory = tempdir().expect("tempdir");
        let spool = EncryptedSpool::new(directory.path().to_path_buf(), [3_u8; 32]).expect("spool");
        spool.append("claude", 1, b"first").expect("append");
        let path = directory.path().join("claude.segment");
        let mut file = std::fs::OpenOptions::new()
            .append(true)
            .open(&path)
            .expect("open");
        file.seek(SeekFrom::End(0)).expect("seek");
        file.write_all(b"broken-tail").expect("corrupt");

        let recovery = spool.recover("claude").expect("recover");
        assert_eq!(recovery.records, vec![b"first".to_vec()]);
        assert!(recovery.quarantined);
        assert!(recovery.truncated_bytes > 0);
    }
}
