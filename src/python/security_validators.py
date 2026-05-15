def validate_safe_identifier(value: str, field_name: str) -> str:
    if not value or not value.replace("_", "").replace("-", "").isalnum():
        raise ValueError(f"Invalid {field_name}")
    return value


def validate_voice_id(value: str) -> str:
    return validate_safe_identifier(value, "voiceId")
