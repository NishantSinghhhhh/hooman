// import multer from 'multer';
// import path from 'path';
// import { Request } from 'express';
// import { QueryType } from '@/types/query';

// // Storage configuration
// const storage = multer.diskStorage({
//   destination: (req: Request, file: Express.Multer.File, cb: Function) => {
//     let uploadPath = 'uploads/';
    
//     // Determine folder based on file type
//     if (file.mimetype.startsWith('image/')) {
//       uploadPath += 'images/';
//     } else if (file.mimetype.startsWith('audio/')) {
//       uploadPath += 'audio/';
//     } else if (file.mimetype.startsWith('video/')) {
//       uploadPath += 'video/';
//     } else {
//       uploadPath += 'documents/';
//     }
    
//     cb(null, uploadPath);
//   },
//   filename: (req: Request, file: Express.Multer.File, cb: Function) => {
//     // Generate unique filename
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     const extension = path.extname(file.originalname);
//     cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
//   }
// });

// // File filter
// const fileFilter = (req: Request, file: Express.Multer.File, cb: Function) => {
//   const allowedTypes = [
//     // Images
//     'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
//     // Audio
//     'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
//     // Video
//     'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm',
//     // Documents
//     'application/pdf', 'text/plain', 'application/msword',
//     'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
//   ];

//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error(`File type ${file.mimetype} is not supported`), false);
//   }
// };

// // Configure multer
// export const upload = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: 50 * 1024 * 1024, // 50MB limit
//     files: 1 // Single file upload
//   }
// });

// // Helper function to determine query type from file
// export const getQueryTypeFromFile = (file: Express.Multer.File): QueryType => {
//   if (file.mimetype.startsWith('image/')) return QueryType.IMAGE;
//   if (file.mimetype.startsWith('audio/')) return QueryType.AUDIO;
//   if (file.mimetype.startsWith('video/')) return QueryType.VIDEO;
//   return QueryType.DOCUMENT;
// };