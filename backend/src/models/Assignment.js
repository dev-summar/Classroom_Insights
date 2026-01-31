
import mongoose from 'mongoose';

// NOTE: syncedBy contains the impersonation email used for authorization (NOT a user identifier)

const assignmentSchema = new mongoose.Schema({
    id: { type: String, required: true }, // Google CourseWork ID
    courseId: { type: String, required: true, ref: 'Course' }, // Use Google Course ID
    title: { type: String, required: true },
    description: String,
    materials: [mongoose.Schema.Types.Mixed],
    state: String,
    alternateLink: String,
    creationTime: Date,
    updateTime: Date,
    dueDate: {
        year: Number,
        month: Number,
        day: Number
    },
    dueTime: {
        hours: Number,
        minutes: Number,
        nanos: Number
    },
    maxPoints: Number,
    workType: String,
    topicId: String,
    syncedBy: String, // Impersonation email used for sync (authorization only)
    syncedAt: Date,
    // Denormalized fields for fast sidebar reads
    courseName: String,
    submissionCount: { type: Number, default: 0 }
}, { timestamps: true });

// CRITICAL INDEXES

assignmentSchema.index({ id: 1 });
assignmentSchema.index({ creationTime: -1 });

// MANDATORY Unique Key: Course ID + Assignment ID
assignmentSchema.index({ courseId: 1, id: 1 }, { unique: true });

const Assignment = mongoose.model('Assignment', assignmentSchema);
export default Assignment;
