import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNotify, useGetIdentity, useGetList } from 'ra-core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, FileIcon, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { getSupabaseConfig } from '@/lib/supabase-config';

interface UploadFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  activityId?: string;
  error?: string;
}

interface IngestionProvider {
  id: string;
  name: string;
  provider_code: string;
  ingestion_key: string;
}

export const FileUpload = () => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [activityType, setActivityType] = useState<string>('note');
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  const notify = useNotify();
  const { data: identity } = useGetIdentity();

  // Load ingestion providers using React-Admin hook (cleaner than manual useEffect)
  const { data: providers = [] } = useGetList<IngestionProvider>('ingestion_providers', {
    filter: { is_active: true },
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'created_at', order: 'DESC' }
  });

  // Auto-select first provider when data loads
  useEffect(() => {
    if (providers.length > 0 && !selectedProvider) {
      setSelectedProvider(providers[0].id);
    }
  }, [providers, selectedProvider]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      status: 'pending' as const,
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    // Accept all file types (removed restrictive accept prop)
    // Only block dangerous executable files for security
    validator: (file) => {
      // Guard against missing file name
      if (!file.name) {
        return null; // Allow files without names (edge case)
      }

      const dangerous = ['.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.ps1', '.msi'];
      const fileName = file.name.toLowerCase();
      const dotIndex = fileName.lastIndexOf('.');

      // If no extension, allow the file
      if (dotIndex === -1) {
        return null;
      }

      const ext = fileName.slice(dotIndex);

      if (dangerous.includes(ext)) {
        return {
          code: 'dangerous-file',
          message: 'Executable files are not allowed for security reasons'
        };
      }
      return null;
    }
  });

  const uploadFile = async (index: number) => {
    const fileToUpload = files[index];
    const provider = providers.find(p => p.id === selectedProvider);

    if (!provider) {
      notify('Please select an ingestion channel', { type: 'error' });
      return;
    }

    const config = getSupabaseConfig();
    const webhookUrl = `${config.url}/functions/v1/ingest-activity`;

    // Update status to uploading
    setFiles(prev => prev.map((f, i) =>
      i === index ? { ...f, status: 'uploading', progress: 0 } : f
    ));

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload.file);
      formData.append('type', activityType);
      formData.append('from', identity?.email || 'manual-upload');
      formData.append('subject', `File Upload: ${fileToUpload.file.name}`);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setFiles(prev => prev.map((f, i) =>
            i === index ? { ...f, progress } : f
          ));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          setFiles(prev => prev.map((f, i) =>
            i === index ? { ...f, status: 'success', progress: 100, activityId: response.id } : f
          ));
          notify(`File uploaded: ${fileToUpload.file.name}`, { type: 'success' });
        } else {
          throw new Error(`Upload failed with status ${xhr.status}`);
        }
      });

      xhr.addEventListener('error', () => {
        setFiles(prev => prev.map((f, i) =>
          i === index ? { ...f, status: 'error', error: 'Network error' } : f
        ));
        notify(`Upload failed: ${fileToUpload.file.name}`, { type: 'error' });
      });

      xhr.open('POST', webhookUrl);
      // Security: Move ingestion key from URL to header (prevents key leakage in logs)
      xhr.setRequestHeader('x-ingestion-key', provider.ingestion_key);
      xhr.send(formData);

    } catch (error) {
      setFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, status: 'error', error: String(error) } : f
      ));
      notify(`Upload failed: ${fileToUpload.file.name}`, { type: 'error' });
    }
  };

  const uploadAll = async () => {
    const pendingFiles = files
      .map((f, index) => ({ file: f, index }))
      .filter(({ file }) => file.status === 'pending');

    // Upload all files in parallel for better performance
    // Browsers manage connection limits automatically (usually 6 concurrent)
    await Promise.all(
      pendingFiles.map(({ index }) => uploadFile(index))
    );
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'success'));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
          <CardDescription>
            Upload documents, images, audio, or video files to create activities.
            Files are automatically stored and linked to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Ingestion Channel</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select channel..." />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(provider => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name} ({provider.provider_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Activity Type</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="call">Call Recording</SelectItem>
                  <SelectItem value="meeting">Meeting Recording</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
              transition-all duration-200
              ${isDragActive
                ? 'border-green-500 bg-green-50 scale-[1.02] shadow-lg'
                : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop files here...</p>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supports all file types (executables blocked for security)
                </p>
              </>
            )}
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Files ({files.length})</h3>
                <div className="space-x-2">
                  <Button
                    size="sm"
                    onClick={uploadAll}
                    disabled={!files.some(f => f.status === 'pending')}
                  >
                    Upload All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearCompleted}
                    disabled={!files.some(f => f.status === 'success')}
                  >
                    Clear Completed
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {files.map((fileItem, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <FileIcon className="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {fileItem.file.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(fileItem.file.size)}
                            {fileItem.activityId && (
                              <span className="ml-2 text-xs">
                                ID: {fileItem.activityId.substring(0, 8)}...
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {fileItem.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => uploadFile(index)}
                          >
                            Upload
                          </Button>
                        )}
                        {fileItem.status === 'uploading' && (
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        )}
                        {fileItem.status === 'success' && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        {fileItem.status === 'error' && (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    {fileItem.status === 'uploading' && (
                      <Progress value={fileItem.progress} className="h-1" />
                    )}

                    {/* Error message */}
                    {fileItem.status === 'error' && fileItem.error && (
                      <p className="text-sm text-red-500">
                        Error: {fileItem.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>• Files are uploaded directly to secure storage (no database bloat)</p>
          <p>• Each file creates an activity record for tracking and search</p>
          <p>• Large files are handled automatically (no size limits)</p>
          <p>• Files are linked to your selected ingestion channel</p>
          <p>• Activities appear in the Activity Feed immediately</p>
        </CardContent>
      </Card>
    </div>
  );
};
