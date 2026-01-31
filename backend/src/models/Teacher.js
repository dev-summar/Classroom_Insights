
import mongoose from 'mongoose';

// NOTE: Google Classroom may return "no-email-*" users due to privacy settings.
// This is EXPECTED behavior and does NOT indicate a permission issue.
// Email visibility is NOT required for authorization or permission checks.
// ALWAYS use userId as the primary identifier, NEVER emailAddress.

const teacherSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // Google User ID (PRIMARY IDENTIFIER)
    fullName: { type: String, required: true },
    emailAddress: { type: String }, // Optional - may be "no-email-*@google.com"
    courseId: { type: String, required: true, ref: 'Course' },
    syncedBy: String, // Impersonation email used for sync (authorization only)
    syncedAt: Date
}, { timestamps: true });

// MANDATORY Unique Key: (userId + courseId)
// Changed from emailAddress to userId to handle no-email-* users correctly
teacherSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const Teacher = mongoose.model('Teacher', teacherSchema);
export default Teacher;
