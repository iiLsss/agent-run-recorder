use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(default, deny_unknown_fields, rename_all = "camelCase")]
pub struct Metadata {
    pub tool_category: Option<ToolCategory>,
    pub relative_path: Option<String>,
    pub file_extension: Option<String>,
    pub artifact_type: Option<ArtifactType>,
    pub token_input: Option<u64>,
    pub token_output: Option<u64>,
    pub credits: Option<String>,
    pub cost_amount: Option<String>,
    pub cost_currency: Option<String>,
    pub error_type: Option<ErrorType>,
    pub domain: Option<String>,
    pub executable: Option<String>,
    pub command_category: Option<CommandCategory>,
    pub exit_code_class: Option<ExitCodeClass>,
    pub artifact_count: Option<u32>,
    pub dropped_metadata_field_count: u32,
}

macro_rules! string_enum {
    ($name:ident { $($variant:ident),+ $(,)? }) => {
        #[derive(Clone, Copy, Debug, Deserialize, Serialize)]
        #[serde(rename_all = "snake_case")]
        pub enum $name {
            $($variant),+
        }
    };
}

string_enum!(ToolCategory {
    Read,
    Write,
    Edit,
    Search,
    Shell,
    Browser,
    Network,
    Data,
    Document,
    Media,
    Other,
    Unknown,
});

string_enum!(ArtifactType {
    Document,
    Spreadsheet,
    Code,
    Image,
    Audio,
    Video,
    Archive,
    Other,
    Unknown,
});

string_enum!(ErrorType {
    Auth,
    Permission,
    NotFound,
    Timeout,
    RateLimit,
    Validation,
    ToolFailure,
    Network,
    Cancelled,
    Unknown,
});

string_enum!(CommandCategory {
    Build,
    Test,
    Lint,
    Format,
    Package,
    Git,
    File,
    Network,
    Process,
    Other,
    Unknown,
});

string_enum!(ExitCodeClass {
    Success,
    Nonzero,
    Signal,
    Unknown,
});
