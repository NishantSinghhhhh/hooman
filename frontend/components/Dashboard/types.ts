export interface UserData {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
  }
  
  export interface QueryHistory {
    id: string
    type: "text" | "image" | "audio" | "video" | "document"
    query: string
    fileName?: string
    response: string
    timestamp: string
    status: "processing" | "completed" | "error"
  }
  