import { NextResponse } from "next/server";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const storageRef = ref(storage, `requests/${Date.now()}_${file.name}`);
    
    // Server-side upload bypasses browser CORS
    const snapshot = await uploadBytes(storageRef, bytes, {
      contentType: file.type,
    });
    
    const downloadURL = await getDownloadURL(snapshot.ref);

    return NextResponse.json({ url: downloadURL });
  } catch (error: any) {
    console.error("Server-side upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
