use thiserror::Error;

#[derive(Debug, Error)]
pub enum RecorderError {
    #[error("database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("secret store error: {0}")]
    SecretStore(String),
    #[error("cryptographic operation failed")]
    Crypto,
    #[error("invalid input: {0}")]
    InvalidInput(String),
    #[error("connector error: {0}")]
    Connector(String),
    #[error("ingestion server error: {0}")]
    Ingestion(String),
}

pub type RecorderResult<T> = Result<T, RecorderError>;
