import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const demoEmail = 'amara.demo@example.test';

async function main() {
	const passwordHash = await bcrypt.hash('DemoPassword123!', 12);
	const user = await prisma.user.upsert({
		where: { email: demoEmail },
		update: {},
		create: { fullName: 'Amara Santos', email: demoEmail, passwordHash, accountStatus: 'ACTIVE' },
	});

	const owner = await prisma.owner.upsert({
		where: { userId: user.id },
		update: {},
		create: { userId: user.id, displayName: 'Amara Santos' },
	});

	const diaryEntry = await prisma.diaryEntry.findFirst({ where: { ownerId: owner.id, title: 'The first day of summer' } }) ?? await prisma.diaryEntry.create({
		data: {
			ownerId: owner.id,
			title: 'The first day of summer',
			category: 'Family',
			originalContent: 'We made lunch by the window and listened to the rain turn into sunlight.',
			normalizedContent: 'We made lunch by the window and listened to the rain turn into sunlight.',
			entryDate: new Date('2024-05-18T12:00:00.000Z'),
			status: 'PRESERVED',
			contentHash: 'demo-entry-hash-001',
		},
	});

	const tag = await prisma.tag.upsert({ where: { name: 'family' }, update: {}, create: { name: 'family' } });
	await prisma.entryTag.upsert({ where: { diaryEntryId_tagId: { diaryEntryId: diaryEntry.id, tagId: tag.id } }, update: {}, create: { diaryEntryId: diaryEntry.id, tagId: tag.id } });
	await prisma.entryVersion.upsert({ where: { diaryEntryId_versionNumber: { diaryEntryId: diaryEntry.id, versionNumber: 1 } }, update: {}, create: { diaryEntryId: diaryEntry.id, versionNumber: 1, writingMode: 'VERBATIM', sourceContent: diaryEntry.originalContent, processedContent: diaryEntry.originalContent, processingNotes: 'Fictional seed revision.' } });
	await prisma.mediaAsset.upsert({ where: { storageKey: 'demo/amara/first-day-of-summer-photo-1' }, update: {}, create: { diaryEntryId: diaryEntry.id, mediaType: 'PHOTO', fileName: 'first-day-of-summer.jpg', storageKey: 'demo/amara/first-day-of-summer-photo-1', mimeType: 'image/jpeg', byteSize: 24576 } });

	const beneficiary = await prisma.beneficiary.upsert({
		where: { ownerId_email: { ownerId: owner.id, email: 'mara.demo@example.test' } },
		update: {},
		create: { ownerId: owner.id, fullName: 'Mara Santos', email: 'mara.demo@example.test', relationship: 'Daughter', status: 'VERIFIED' },
	});

	const policy = await prisma.accessPolicy.findFirst({ where: { ownerId: owner.id, name: 'Family memories' } }) ?? await prisma.accessPolicy.create({
		data: {
			ownerId: owner.id,
			beneficiaryId: beneficiary.id,
			name: 'Family memories',
			description: 'Fictional development policy for family memories.',
			sourceCode: 'grant family_memories to mara when release_date is reached',
			compiledFacts: 'demo_fact(family_memories).',
			compilationStatus: 'VALID',
			status: 'ACTIVE',
			currentVersion: 1,
			rules: { create: { resourceType: 'DIARY_CATEGORY', resourceId: 'Family', allowedActions: ['READ'] } },
			versions: { create: { versionNumber: 1, sourceCode: 'grant family_memories to mara when release_date is reached', compiledFacts: 'demo_fact(family_memories).', compilationStatus: 'VALID' } },
		},
	});

	await prisma.letterOfWishes.upsert({ where: { ownerId: owner.id }, update: {}, create: { ownerId: owner.id, title: 'A letter for the people I love', content: 'This fictional development letter is a personal guide, not a legally binding will.' } });
	console.log(`Seeded fictional Alaala data for ${user.email} with policy ${policy.name}.`);
}

main().catch((error) => {
	console.error('Database seed failed.', error instanceof Error ? error.message : 'Unknown error');
	process.exitCode = 1;
}).finally(async () => {
	await prisma.$disconnect();
});