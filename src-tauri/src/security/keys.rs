use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use hkdf::Hkdf;
use keyring::Entry;
use rand::random;
use sha2::Sha256;
use zeroize::{Zeroize, ZeroizeOnDrop};

use crate::error::{RecorderError, RecorderResult};

const KEYRING_SERVICE: &str = "com.local.agentrunrecorder";
const KEYRING_USER: &str = "root-key-v1";

#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct DataKeys {
    pub database: [u8; 32],
    pub spool: [u8; 32],
    pub connector: [u8; 32],
    pub tokenization: [u8; 32],
    pub config_backup: [u8; 32],
}

pub struct KeyManager;

impl KeyManager {
    pub fn load_or_create() -> RecorderResult<DataKeys> {
        let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER)
            .map_err(|error| RecorderError::SecretStore(error.to_string()))?;
        let mut root_key = load_or_create_root_key(&entry)?;
        let keys = Self::derive(&root_key)?;
        root_key.zeroize();
        Ok(keys)
    }

    pub fn derive(root_key: &[u8; 32]) -> RecorderResult<DataKeys> {
        Ok(DataKeys {
            database: derive_key(root_key, b"database-dek-v1")?,
            spool: derive_key(root_key, b"spool-dek-v1")?,
            connector: derive_key(root_key, b"connector-token-v1")?,
            tokenization: derive_key(root_key, b"identity-token-v1")?,
            config_backup: derive_key(root_key, b"config-backup-v1")?,
        })
    }
}

impl DataKeys {
    pub fn connector_token(&self) -> String {
        URL_SAFE_NO_PAD.encode(self.connector)
    }
}

fn load_or_create_root_key(entry: &Entry) -> RecorderResult<[u8; 32]> {
    match entry.get_secret() {
        Ok(secret) => secret
            .try_into()
            .map_err(|_| RecorderError::SecretStore("invalid root key length".into())),
        Err(keyring::Error::NoEntry) => create_root_key(entry),
        Err(error) => Err(RecorderError::SecretStore(error.to_string())),
    }
}

fn create_root_key(entry: &Entry) -> RecorderResult<[u8; 32]> {
    let root_key = random::<[u8; 32]>();
    entry
        .set_secret(&root_key)
        .map_err(|error| RecorderError::SecretStore(error.to_string()))?;
    Ok(root_key)
}

fn derive_key(root_key: &[u8], purpose: &[u8]) -> RecorderResult<[u8; 32]> {
    let hkdf = Hkdf::<Sha256>::new(Some(b"agent-run-recorder-v1"), root_key);
    let mut output = [0_u8; 32];
    hkdf.expand(purpose, &mut output)
        .map_err(|_| RecorderError::Crypto)?;
    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::KeyManager;

    #[test]
    fn derives_distinct_stable_keys() {
        let root = [7_u8; 32];
        let first = KeyManager::derive(&root).expect("derive keys");
        let second = KeyManager::derive(&root).expect("derive keys");

        assert_eq!(first.database, second.database);
        assert_ne!(first.database, first.spool);
        assert_ne!(first.connector, first.tokenization);
        assert_eq!(first.connector_token().len(), 43);
    }
}
