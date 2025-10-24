import { useState } from "react";
import { ImageUpload } from "../ImageUpload";

export default function ImageUploadExample() {
  const [image, setImage] = useState<string>();

  return (
    <div className="p-6 max-w-md">
      <ImageUpload value={image} onChange={setImage} />
    </div>
  );
}
