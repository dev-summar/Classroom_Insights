import mongoose from 'mongoose';

// NOTE: Google Classroom may return "no-email-*" users.
// - ownerId: Google User ID of the course owner (PRIMARY IDENTIFIER)
// - teachers: Array of Google User IDs (NOT emails)
// - students: Array of Google User IDs (NOT emails)
// - syncedBy: Impersonation email used for authorization (NOT a user identifier)

const courseSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Google Course ID
    name: { type: String, required: true },
    section: String,
    descriptionHeading: String,
    room: String,
    ownerId: { type: String, required: true }, // Google User ID of owner (PRIMARY IDENTIFIER)
    creationTime: Date,
    updateTime: Date,
    enrollmentCode: String,
    courseState: String, // ACTIVE, ARCHIVED...
    alternateLink: String,
    teacherGroupEmail: String,
    courseGroupEmail: String,
    guardiansEnabled: Boolean,
    calendarId: String,
    teachers: [String], // Array of Google User IDs (NOT emails)
    students: [String], // Array of Google User IDs (NOT emails)
    lastSync: Date,
    syncedBy: String, // Impersonation email used for sync (authorization only)
    syncedAt: Date,
    semester: String,
    institute: String,
    // Denormalized fields for fast sidebar reads
    teacherCount: { type: Number, default: 0 },
    studentCount: { type: Number, default: 0 },
    assignmentCount: { type: Number, default: 0 }
}, { timestamps: true });

// CRITICAL INDEXES
courseSchema.index({ courseState: 1 });
courseSchema.index({ ownerId: 1 });

const Course = mongoose.model('Course', courseSchema);

export default Course;
