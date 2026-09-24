import { useRef, useState, type ChangeEvent } from 'react';
import { apiClient } from '../api/axios';
import type { User, ErrorEnvelope } from '../types/user';

type PhotoKind = 'profile' | 'cover';

interface PhotoUploaderProps {
  kind: PhotoKind;
  currentUrl: string | null;
  userId: string;
  onChange: (newUrl: string | null) => void;
}

/**
 * Reusable photo uploader.
 * - Renders a clickable preview (avatar circle or cover banner).
 * - On file selection, automatically uploads and replaces the current photo.
 * - When a photo already exists, a small "Remove" button is shown.
 * - On failure, surfaces the API error inline.
 */
export function PhotoUploader({ kind, currentUrl, userId, onChange }: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = `/users/me/${kind === 'profile' ? 'profile-photo' : 'cover-photo'}`;
  const accept = 'image/jpeg,image/png,image/webp';
  const label = kind === 'profile' ? 'profile photo' : 'cover photo';

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file
    if (!file) return;

    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Note: do NOT set Content-Type manually — axios adds the multipart boundary.
      const res = await apiClient.post<{ success: true; statusCode: number; data: User }>(endpoint, formData);
      const newUrl =
        kind === 'profile' ? res.data.data.profilePhotoUrl : res.data.data.coverPhotoUrl;
      onChange(newUrl);
    } catch (err) {
      const e = err as { response?: { data?: ErrorEnvelope } };
      setError(e.response?.data?.error?.message ?? `Failed to upload ${label}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm(`Remove your ${label}?`)) return;

    setError(null);
    setRemoving(true);

    try {
      const res = await apiClient.delete<{ success: true; statusCode: number; data: User }>(endpoint);
      const newUrl =
        kind === 'profile' ? res.data.data.profilePhotoUrl : res.data.data.coverPhotoUrl;
      onChange(newUrl);
    } catch (err) {
      const e = err as { response?: { data?: ErrorEnvelope } };
      setError(e.response?.data?.error?.message ?? `Failed to remove ${label}`);
    } finally {
      setRemoving(false);
    }
  };

  const className = `photo-uploader photo-uploader--${kind}`;

  return (
    <div className={className}>
      <button
        type="button"
        className="photo-uploader__preview"
        onClick={handleClick}
        disabled={uploading || removing}
        title={`Click to change your ${label}`}
        style={
          kind === 'cover' && currentUrl
            ? { backgroundImage: `url(${currentUrl})` }
            : undefined
        }
      >
        {kind === 'profile' ? (
          currentUrl ? (
            <img src={currentUrl} alt="Profile" />
          ) : (
            <AvatarPlaceholder userId={userId} />
          )
        ) : !currentUrl ? (
          <CoverPlaceholder />
        ) : null}

        {(uploading || removing) && (
          <div className="photo-uploader__overlay">
            <span className="photo-uploader__spinner" />
            {uploading ? `Uploading…` : `Removing…`}
          </div>
        )}

        {!uploading && !removing && (
          <div className="photo-uploader__hover">
            <span>📷 {currentUrl ? 'Change' : `Add ${label}`}</span>
          </div>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        hidden
        onChange={handleFile}
      />

      {currentUrl && !uploading && !removing && (
        <button
          type="button"
          className="photo-uploader__remove"
          onClick={handleRemove}
          aria-label={`Remove ${label}`}
        >
          ✕
        </button>
      )}

      {error && <div className="photo-uploader__error">{error}</div>}
    </div>
  );
}

function AvatarPlaceholder({ userId }: { userId: string }) {
  // Derive initials from stored user info available via the parent; fallback to "?"
  // The parent could pass a name prop, but a stable coloured circle from id initials
  // is enough for the placeholder.
  const initials = userId.slice(0, 2).toUpperCase();
  return <span className="photo-uploader__initials">{initials}</span>;
}

function CoverPlaceholder() {
  return (
    <span className="photo-uploader__cover-placeholder">
      <span>🖼️</span>
      <span className="photo-uploader__cover-label">Add cover photo</span>
    </span>
  );
}