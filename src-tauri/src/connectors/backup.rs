use std::{
    fs::{OpenOptions, Permissions},
    io::Write,
    path::{Path, PathBuf},
};

use aes_gcm::{
    Aes256Gcm, Nonce,
    aead::{Aead, KeyInit},
};
use chrono::Utc;
use rand::random;

use crate::error::{RecorderError, RecorderResult};

#[derive(Clone)]
pub struct ConfigBackupStore {
    directory: PathBuf,
    key: [u8; 32],
}

impl ConfigBackupStore {
    pub fn new(directory: PathBuf, key: [u8; 32]) -> RecorderResult<Self> {
        std::fs::create_dir_all(&directory)?;
        restrict_directory(&directory)?;
        Ok(Self { directory, key })
    }

    pub fn save(&self, connector: &str, plaintext: &[u8]) -> RecorderResult<PathBuf> {
        let connector_dir = self.directory.join(connector);
        std::fs::create_dir_all(&connector_dir)?;
        restrict_directory(&connector_dir)?;
        let nonce = random::<[u8; 12]>();
        let cipher = Aes256Gcm::new_from_slice(&self.key).map_err(|_| RecorderError::Crypto)?;
        let nonce = Nonce::try_from(nonce.as_slice()).map_err(|_| RecorderError::Crypto)?;
        let ciphertext = cipher
            .encrypt(&nonce, plaintext)
            .map_err(|_| RecorderError::Crypto)?;
        let path = connector_dir.join(format!("{}.backup", Utc::now().timestamp_millis()));
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&path)?;
        file.write_all(b"ARRC\x01")?;
        file.write_all(&nonce)?;
        file.write_all(&ciphertext)?;
        file.sync_all()?;
        restrict_file(&path)?;
        prune_backups(&connector_dir, 5)?;
        Ok(path)
    }
}

fn prune_backups(directory: &Path, keep: usize) -> RecorderResult<()> {
    let mut backups = std::fs::read_dir(directory)?
        .filter_map(Result::ok)
        .filter(|entry| {
            entry
                .path()
                .extension()
                .is_some_and(|value| value == "backup")
        })
        .collect::<Vec<_>>();
    backups.sort_by_key(|entry| std::cmp::Reverse(entry.file_name()));
    for backup in backups.into_iter().skip(keep) {
        std::fs::remove_file(backup.path())?;
    }
    Ok(())
}

#[cfg(unix)]
fn restrict_directory(path: &Path) -> RecorderResult<()> {
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(path, Permissions::from_mode(0o700))?;
    Ok(())
}

#[cfg(not(unix))]
fn restrict_directory(_path: &Path) -> RecorderResult<()> {
    Ok(())
}

#[cfg(unix)]
pub fn restrict_file(path: &Path) -> RecorderResult<()> {
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(path, Permissions::from_mode(0o600))?;
    Ok(())
}

#[cfg(not(unix))]
pub fn restrict_file(_path: &Path) -> RecorderResult<()> {
    Ok(())
}
