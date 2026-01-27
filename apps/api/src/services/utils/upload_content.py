from typing import Literal, Optional
import boto3
from botocore.exceptions import ClientError
import os
from fastapi import HTTPException, UploadFile
from config.config import get_nexo_config
from src.security.file_validation import validate_upload


def ensure_directory_exists(directory: str):
    if not os.path.exists(directory):
        os.makedirs(directory)


def _get_filesystem_root() -> str:
    """
    Root directory where uploaded content is stored when using filesystem content delivery.

    Defaults to "content" for local dev, but should be set to a persistent disk mount
    in production (e.g. Render) via NEXO_CONTENT_ROOT.
    """
    nexo_config = get_nexo_config()
    root = getattr(nexo_config.hosting_config.content_delivery, "filesystem_root", None) or "content"
    return str(root).rstrip("/\\")


async def upload_file(
    file: UploadFile,
    directory: str,
    type_of_dir: Literal["orgs", "users"],
    uuid: str,
    allowed_types: list[str],
    filename_prefix: str,
    max_size: Optional[int] = None,
) -> str:
    """
    Secure file upload with validation.
    
    Args:
        file: The uploaded file
        directory: Target directory (e.g., "logos", "avatars")
        type_of_dir: "orgs" or "users"
        uuid: Organization or user UUID
        allowed_types: List of allowed file types ('image', 'video', 'document')
        filename_prefix: Prefix for the generated filename
        max_size: Maximum file size in bytes (optional)
        
    Returns:
        The saved filename
    """
    from uuid import uuid4
    from src.security.file_validation import get_safe_filename
    
    # Validate the file
    _, content = validate_upload(file, allowed_types, max_size)
    
    # Generate safe filename
    filename = get_safe_filename(file.filename, f"{uuid4()}_{filename_prefix}")
    
    # Save the file
    await upload_content(
        directory=directory,
        type_of_dir=type_of_dir,
        uuid=uuid,
        file_binary=content,
        file_and_format=filename,
        allowed_formats=None,  # Already validated
    )
    
    return filename


async def upload_content(
    directory: str,
    type_of_dir: Literal["orgs", "users"],
    uuid: str,  # org_uuid or user_uuid
    file_binary: bytes,
    file_and_format: str,
    allowed_formats: Optional[list[str]] = None,
):
    # Get Nexo Academy Config
    nexo_config = get_nexo_config()

    file_format = file_and_format.split(".")[-1].strip().lower()

    # Get content delivery method
    content_delivery = nexo_config.hosting_config.content_delivery.type

    # Check if format file is allowed
    if allowed_formats:
        if file_format not in allowed_formats:
            raise HTTPException(
                status_code=400,
                detail=f"File format {file_format} not allowed",
            )

    filesystem_root = _get_filesystem_root()
    rel_dir = os.path.join(type_of_dir, uuid, directory)
    full_dir = os.path.join(filesystem_root, rel_dir)
    ensure_directory_exists(full_dir)

    if content_delivery == "filesystem":
        # upload file to server
        with open(os.path.join(full_dir, file_and_format), "wb") as f:
            f.write(file_binary)
            f.close()

    elif content_delivery == "s3api":
        # Upload to server then to s3 (AWS Keys are stored in environment variables and are loaded by boto3)
        # TODO: Improve implementation of this
        print("Uploading to s3...")
        s3 = boto3.client(
            "s3",
            endpoint_url=nexo_config.hosting_config.content_delivery.s3api.endpoint_url,
        )

        # Upload file to server (staging) then to s3
        with open(os.path.join(full_dir, file_and_format), "wb") as f:
            f.write(file_binary)
            f.close()

        print("Uploading to s3 using boto3...")
        try:
            s3.upload_file(
                os.path.join(full_dir, file_and_format),
                "nexo-media",
                f"content/{type_of_dir}/{uuid}/{directory}/{file_and_format}",
            )
        except ClientError as e:
            print(e)

        print("Checking if file exists in s3...")
        try:
            s3.head_object(
                Bucket="nexo-media",
                Key=f"content/{type_of_dir}/{uuid}/{directory}/{file_and_format}",
            )
            print("File upload successful!")
        except Exception as e:
            print(f"An error occurred: {str(e)}")
