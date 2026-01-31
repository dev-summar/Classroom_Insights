
import mongoose from 'mongoose';

// NOTE: userId is the PRIMARY IDENTIFIER (Google User ID, NOT email)
// syncedBy contains the impersonation email used for authorization (NOT a user identifier)

const submissionSchema = new mongoose.Schema({
    id: { type: String, required: true }, // Google Submission ID
    courseId: { type: String, required: true },
    courseWorkId: { type: String, required: true, ref: 'Assignment' }, // Google CourseWork ID
    userId: { type: String, required: true, ref: 'User' }, // Google User ID (PRIMARY IDENTIFIER)
    studentUserId: { type: String, required: true }, // Duplicate of userId for legacy/convenience
    state: { type: String, required: true },
    late: { type: Boolean, default: false },
    draftGrade: Number,
    assignedGrade: Number,
    alternateLink: String,
    creationTime: Date,
    updateTime: Date,
    syncedBy: String, // Impersonation email used for sync (authorization only)
    syncedAt: Date,
    // Denormalized fields for fast sidebar reads
    studentName: String,
    studentEmail: String,
    courseName: String,
    assignmentTitle: String
}, { timestamps: true });

// CRITICAL INDEXES

submissionSchema.index({ courseWorkId: 1 });
submissionSchema.index({ userId: 1 });
submissionSchema.index({ studentUserId: 1 });
submissionSchema.index({ state: 1 });

// MANDATORY Unique Key: Course ID + Assignment ID + User ID
submissionSchema.index({ courseId: 1, courseWorkId: 1, userId: 1 }, { unique: true });

const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;
