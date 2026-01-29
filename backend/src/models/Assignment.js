import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Google CourseWork ID
    courseId: { type: String, required: true, ref: 'Course' }, // Use Google Course ID for easier querying? Or Mongo ID? Using Google ID usually safer for syncing
    title: { type: String, required: true },
    description: String,
    materials: [mongoose.Schema.Types.Mixed], // Can be varied structure
    state: String, // PUBLISHED, DRAFT...
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
    workType: String, // ASSIGNMENT, SHORT_ANSWER_QUESTION...
    topicId: String
}, { timestamps: true });

const Assignment = mongoose.model('Assignment', assignmentSchema);
export default Assignment;
