export default async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      resolve(reader?.result?.toString() || '');
    };

    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}
