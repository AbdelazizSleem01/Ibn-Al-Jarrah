import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAdmin extends Document {
  email: string;
  password: string;
  name: string;
  createdAt: Date;
}

const AdminSchema = new Schema<IAdmin>({
  email: {
    type: String,
    required: [true, "البريد الإلكتروني مطلوب"],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  password: {
    type: String,
    required: [true, "كلمة المرور مطلوبة"],
  },
  name: {
    type: String,
    required: [true, "الاسم مطلوب"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Avoid Mongoose model overwrite in development
const Admin: Model<IAdmin> = mongoose.models.Admin || mongoose.model<IAdmin>("Admin", AdminSchema);

export default Admin;
