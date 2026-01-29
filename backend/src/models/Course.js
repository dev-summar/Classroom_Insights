import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Google Course ID
    name: { type: String, required: true },
    section: String,
    descriptionHeading: String,
    room: String,
    ownerId: { type: String, required: true }, // Google User ID of owner
    creationTime: Date,
    updateTime: Date,
    enrollmentCode: String,
    courseState: String, // ACTIVE, ARCHIVED...
    alternateLink: String,
    teacherGroupEmail: String,
    courseGroupEmail: String,
    guardiansEnabled: Boolean,
    calendarId: String,
    teachers: [String],
    students: [String],
    lastSync: Date
}, { timestamps: true });

const Course = mongoose.model('Course', courseSchema);

export default Course;
