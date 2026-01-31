/**
 * Database Migration Script
 * 
 * Purpose: Drop old email-based unique index on Teacher collection
 * and create new userId-based unique index
 * 
 * Run this script ONCE after deploying the code fixes
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const migrateTeacherIndex = async () => {
    try {
        console.log('[MIGRATION] Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('[MIGRATION] Connected successfully');

        const db = mongoose.connection.db;
        const teachersCollection = db.collection('teachers');

        // 1. List current indexes
        console.log('\n[MIGRATION] Current indexes on teachers collection:');
        const currentIndexes = await teachersCollection.indexes();
        currentIndexes.forEach(index => {
            console.log(`  - ${index.name}:`, JSON.stringify(index.key));
        });

        // 2. Drop old email-based index if it exists
        const oldIndexName = 'emailAddress_1_courseId_1';
        const hasOldIndex = currentIndexes.some(idx => idx.name === oldIndexName);

        if (hasOldIndex) {
            console.log(`\n[MIGRATION] Dropping old index: ${oldIndexName}`);
            await teachersCollection.dropIndex(oldIndexName);
            console.log('[MIGRATION] ✅ Old index dropped successfully');
        } else {
            console.log(`\n[MIGRATION] ℹ️  Old index "${oldIndexName}" not found (may have been dropped already)`);
        }

        // 3. Create new userId-based index
        const newIndexName = 'userId_1_courseId_1';
        const hasNewIndex = currentIndexes.some(idx => idx.name === newIndexName);

        if (!hasNewIndex) {
            console.log(`\n[MIGRATION] Creating new index: ${newIndexName}`);
            await teachersCollection.createIndex(
                { userId: 1, courseId: 1 },
                { unique: true, name: newIndexName }
            );
            console.log('[MIGRATION] ✅ New index created successfully');
        } else {
            console.log(`\n[MIGRATION] ℹ️  New index "${newIndexName}" already exists`);
        }

        // 4. Verify final state
        console.log('\n[MIGRATION] Final indexes on teachers collection:');
        const finalIndexes = await teachersCollection.indexes();
        finalIndexes.forEach(index => {
            console.log(`  - ${index.name}:`, JSON.stringify(index.key));
        });

        // 5. Check for any duplicate data that would violate new constraint
        console.log('\n[MIGRATION] Checking for duplicate (userId + courseId) combinations...');
        const duplicates = await teachersCollection.aggregate([
            {
                $group: {
                    _id: { userId: '$userId', courseId: '$courseId' },
                    count: { $sum: 1 },
                    docs: { $push: '$_id' }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ]).toArray();

        if (duplicates.length > 0) {
            console.log(`\n⚠️  WARNING: Found ${duplicates.length} duplicate (userId + courseId) combinations:`);
            duplicates.forEach(dup => {
                console.log(`  - userId: ${dup._id.userId}, courseId: ${dup._id.courseId}, count: ${dup.count}`);
            });
            console.log('\n  These duplicates should be cleaned up before the new index can be enforced.');
            console.log('  The sync service will handle this automatically on next sync.');
        } else {
            console.log('[MIGRATION] ✅ No duplicates found');
        }

        console.log('\n[MIGRATION] Migration completed successfully! 🎉');
        console.log('\nNext steps:');
        console.log('1. Restart your backend server to apply model changes');
        console.log('2. Trigger a fresh sync to populate data with new structure');
        console.log('3. Verify dashboard and AI insights are working correctly\n');

    } catch (error) {
        console.error('\n[MIGRATION ERROR]', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('[MIGRATION] Database connection closed');
        process.exit(0);
    }
};

// Run migration
migrateTeacherIndex();
