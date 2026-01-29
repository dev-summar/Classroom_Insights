import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Google Submission ID
    courseId: { type: String, required: true },
    courseWorkId: { type: String, required: true, ref: 'Assignment' }, // Google CourseWork ID
    userId: { type: String, required: true, ref: 'User' }, // Google User ID ideally? Or Mongo? Since I want to link to User model, use Mongo ID if possible, but syncing might be tricky.
    // If I sync roster first, I can resolve Google User ID -> Mongo User ID.
    // Or store Google User ID directly and rely on indexing.
    // User model has googleId.
    // I will store both for flexibility? Or just Google User ID and populate virtually?
    // Populate virtually is cleaner but harder with Mongoose sometimes.
    // I'll store Google User ID as `studentUserId` and Mongo ID as `studentRef` if resolved.

    studentUserId: { type: String, required: true }, // Google ID

    state: { type: String, required: true }, // NEW, CREATED, TURNED_IN, RETURNED, RECLAIMED_BY_STUDENT
    late: { type: Boolean, default: false },
    draftGrade: Number,
    assignedGrade: Number,
    alternateLink: String,

    // Guardian email status? User asked for "Guardian email status".
    // Usually that's on Student object, not Submission. "guardianInvited", "guardianEnabled".
    // But maybe submission has something? No.
    // User meant "Fetch student submissions... Guardian email status". Probably separate points.

    creationTime: Date,
    updateTime: Date
}, { timestamps: true });

// Index for efficient querying by student or assignment
submissionSchema.index({ courseId: 1, courseWorkId: 1, userId: 1 });

const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;
