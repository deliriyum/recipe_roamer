import { useState } from "react";
import { Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  value?: string;
  onChange: (value: string | undefined) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onChange(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onChange(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (value) {
    return (
      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
        <img src={value} alt="Upload preview" className="w-full h-full object-cover" />
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2"
          onClick={() => onChange(undefined)}
          data-testid="button-remove-image"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid="dropzone-image"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-2">
          <Camera className="w-8 h-8 text-muted-foreground" />
          <Upload className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium mb-1">
            Drop an image here or click to upload
          </p>
          <p className="text-xs text-muted-foreground">
            Supports JPG, PNG, or WebP
          </p>
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="image-upload"
        />
        <label htmlFor="image-upload">
          <Button variant="outline" asChild data-testid="button-upload-image">
            <span>Choose Image</span>
          </Button>
        </label>
      </div>
    </div>
  );
}
