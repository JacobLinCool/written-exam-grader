<script lang="ts">
	import { Button, Card, Heading, P, Badge, Hr } from 'flowbite-svelte';
	import {
		Camera,
		FileText,
		Sparkles,
		CircleCheckBig,
		ArrowRight,
		Key,
		Shield,
		Clock
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';

	function startGrading() {
		goto('/grade');
	}
</script>

<svelte:head>
	<title>Written Exam Grader - AI-Powered Automatic Grading</title>
	<meta
		name="description"
		content="Automatically grade handwritten answer sheets using AI. Mobile-friendly, private, and fast."
	/>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-primary-50 via-white to-primary-100">
	<!-- Hero Section -->
	<div class="container mx-auto px-4 py-16 md:py-24">
		<div class="text-center">
			<!-- Main Title -->
			<div class="mb-8">
				<div class="mb-6 inline-flex items-center transition-all duration-300 hover:scale-105">
					<Badge color="red" large class="px-4 py-2">
						<Sparkles class="mr-2 h-4 w-4" />
						AI-Powered Grading
					</Badge>
				</div>
				<Heading
					tag="h1"
					class="mb-6 text-4xl leading-tight font-bold text-gray-900 transition-all duration-500 md:text-6xl"
				>
					Written Exam Grader
				</Heading>
				<P
					class="mx-auto mb-8 max-w-3xl text-lg leading-relaxed text-gray-600 transition-opacity duration-700 md:text-xl"
					align="center"
				>
					Let the AI grader read handwriting, score answers, and provide clear feedback — so you can
					grade an entire class in minutes, not hours. Private, mobile-friendly, and built for
					teachers.
				</P>
			</div>

			<!-- CTA Buttons -->
			<div class="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
				<Button
					size="xl"
					color="red"
					onclick={startGrading}
					class="w-full transition-all duration-300 hover:scale-105 hover:shadow-lg sm:w-auto"
				>
					<ArrowRight class="mr-2 h-5 w-5" />
					Start Grading Now
				</Button>
				<Button
					size="xl"
					color="light"
					href="#how-it-works"
					class="w-full transition-all duration-300 hover:scale-105 sm:w-auto"
				>
					Learn How It Works
				</Button>
			</div>
		</div>
	</div>

	<!-- Features Section -->
	<div class="bg-white py-20">
		<div class="container mx-auto px-4">
			<div class="mb-16 text-center">
				<Heading tag="h2" class="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">
					Why Teachers Love It
				</Heading>
				<P class="mx-auto max-w-2xl text-lg leading-relaxed text-gray-600" align="center">
					Save time, improve fairness, and keep student data private — fast, mobile-first grading
					that teachers trust.
				</P>
			</div>

			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				<!-- Feature 1: Accuracy -->
				<Card
					size="xl"
					class="p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
				>
					<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
						<Sparkles class="h-6 w-6 text-primary-600" />
					</div>
					<Heading tag="h3" class="mb-2 text-xl">Explainable and Evidence-Backed Scoring</Heading>
					<P class="text-gray-600">
						Scores are explained, not guessed. Each decision is linked to <strong
							>visual evidence</strong
						> in the original answer image and supported by a clear, step-by-step rationale. Review becomes
						fast, transparent, and auditable.
					</P>
				</Card>

				<!-- Feature 2: Time-Saving -->
				<Card
					size="xl"
					class="p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
				>
					<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
						<Clock class="h-6 w-6 text-primary-600" />
					</div>
					<Heading tag="h3" class="mb-2 text-xl">Grade an Entire Class in Minutes</Heading>
					<P class="text-gray-600">
						No more manual correction marathons — the AI handles handwriting recognition, scoring,
						and feedback automatically. Reclaim your time to focus on what truly matters: teaching
						and mentoring your students.
					</P>
				</Card>

				<!-- Feature 3: Detailed Control -->
				<Card
					size="xl"
					class="p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
				>
					<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
						<FileText class="h-6 w-6 text-primary-600" />
					</div>
					<Heading tag="h3" class="mb-2 text-xl">Detailed Control & Custom Scoring Rules</Heading>
					<P class="text-gray-600">
						Set precise scoring schemes, including <strong>partial credit</strong> and
						<strong>question-specific rubrics</strong>. Upload a question sheet with detailed
						marking rules, and the grader automatically applies them — ensuring both consistency and
						flexibility across all exams.
					</P>
				</Card>

				<!-- Feature 4: Mobile-Friendly -->
				<Card
					size="xl"
					class="p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
				>
					<div
						class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary-100 transition-all duration-300"
					>
						<Camera class="h-6 w-6 text-secondary-600" />
					</div>
					<Heading tag="h3" class="mb-2 text-xl">Mobile-Friendly Workflow</Heading>
					<P class="text-gray-600"
						>Capture answers with your phone or upload images — no scanner needed.</P
					>
				</Card>

				<!-- Feature 5: Secure & Private -->
				<Card
					size="xl"
					class="p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
				>
					<div
						class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary-100 transition-all duration-300"
					>
						<Shield class="h-6 w-6 text-secondary-600" />
					</div>
					<Heading tag="h3" class="mb-2 text-xl">Secure & Private</Heading>
					<P class="text-gray-600"
						>Open-source and auditable. Self-host to keep data on your infrastructure and retain
						full control over student data.</P
					>
				</Card>

				<!-- Feature 6: Simple 3-Step Process -->
				<Card
					size="xl"
					class="p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
				>
					<div
						class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary-100 transition-all duration-300"
					>
						<CircleCheckBig class="h-6 w-6 text-secondary-600" />
					</div>
					<Heading tag="h3" class="mb-2 text-xl">Simple 3-Step Process</Heading>
					<P class="text-gray-600"
						>Upload the question sheet, capture answers, and receive graded results — no setup or
						model training required.</P
					>
				</Card>
			</div>
		</div>
	</div>

	<!-- How It Works Section -->
	<div id="how-it-works" class="bg-gradient-to-b from-white to-primary-50 py-16">
		<div class="container mx-auto px-4">
			<div class="mb-12 text-center">
				<Heading tag="h2" class="mb-4 text-3xl font-bold md:text-4xl">How It Works</Heading>
				<P class="mx-auto max-w-2xl text-gray-600" align="center"
					>Get started in three simple steps</P
				>
			</div>

			<div class="mx-auto max-w-4xl space-y-8">
				<!-- Step 1 -->
				<Card size="xl" class="p-6 transition-all duration-500 hover:scale-105 hover:shadow-xl">
					<div class="flex flex-col items-start gap-6 md:flex-row">
						<div
							class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-600 transition-all duration-300 hover:bg-primary-200"
						>
							1
						</div>
						<div class="flex-1">
							<Heading tag="h3" class="mb-2 text-xl">Upload Question Sheet</Heading>
							<P class="text-gray-600">
								Upload a PDF containing your exam questions, correct answers, and the mark
								allocation for each question. This will be used as the grading reference.
							</P>
						</div>
						<FileText
							class="h-12 w-12 text-primary-600 opacity-20 transition-opacity duration-300 hover:opacity-40"
						/>
					</div>
				</Card>

				<!-- Step 2 -->
				<Card size="xl" class="p-6 transition-all duration-500 hover:scale-105 hover:shadow-xl">
					<div class="flex flex-col items-start gap-6 md:flex-row">
						<div
							class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-600 transition-all duration-300 hover:bg-primary-200"
						>
							2
						</div>
						<div class="flex-1">
							<Heading tag="h3" class="mb-2 text-xl">Capture Answer Sheets</Heading>
							<P class="text-gray-600">
								Take photos of students' answer sheets using your device's camera or upload existing
								images. Multiple images per student are supported.
							</P>
						</div>
						<Camera
							class="h-12 w-12 text-primary-600 opacity-20 transition-opacity duration-300 hover:opacity-40"
						/>
					</div>
				</Card>

				<!-- Step 3 -->
				<Card size="xl" class="p-6 transition-all duration-500 hover:scale-105 hover:shadow-xl">
					<div class="flex flex-col items-start gap-6 md:flex-row">
						<div
							class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-600 transition-all duration-300 hover:bg-primary-200"
						>
							3
						</div>
						<div class="flex-1">
							<Heading tag="h3" class="mb-2 text-xl">Get Instant Results</Heading>
							<P class="text-gray-600">
								The AI analyzes handwriting and automatically grades each answer. Get detailed
								feedback, scores, and explanations for each question.
							</P>
						</div>
						<CircleCheckBig
							class="h-12 w-12 text-primary-600 opacity-20 transition-opacity duration-300 hover:opacity-40"
						/>
					</div>
				</Card>
			</div>
		</div>
	</div>

	<!-- Pro Mode Section -->
	<div class="bg-white py-16">
		<div class="container mx-auto px-4">
			<div class="mx-auto max-w-4xl">
				<div class="mb-12 text-center">
					<div class="mb-6 inline-flex items-center justify-center">
						<Badge color="red" large class="px-4 py-2">
							<Sparkles class="mr-2 h-4 w-4" />
							Pro Mode
						</Badge>
					</div>
					<Heading tag="h2" class="mb-4 text-3xl font-bold md:text-4xl">
						Enhanced Accuracy with Multi-Pass Validation
					</Heading>
					<P class="mx-auto max-w-2xl text-lg text-gray-600" align="center">
						For high-stakes exams and complex answers — Pro Mode runs multiple AI passes with
						confidence scoring and majority voting.
					</P>
				</div>

				<div class="grid gap-8 md:grid-cols-2">
					<!-- Standard Mode -->
					<Card size="xl" class="p-6 transition-all duration-300 hover:shadow-lg">
						<div class="mb-4">
							<Heading tag="h3" class="mb-2 text-2xl">Standard Mode</Heading>
							<P class="text-gray-600">Quick, single-pass grading for regular assessments</P>
						</div>
						<Hr class="my-4" />
						<ul class="space-y-3 text-gray-600">
							<li class="flex items-start gap-3">
								<CircleCheckBig class="mt-0.5 h-5 w-5 text-green-600" />
								<span>One AI analysis pass per answer sheet</span>
							</li>
							<li class="flex items-start gap-3">
								<CircleCheckBig class="mt-0.5 h-5 w-5 text-green-600" />
								<span>~2 minutes per sheet</span>
							</li>
							<li class="flex items-start gap-3">
								<CircleCheckBig class="mt-0.5 h-5 w-5 text-green-600" />
								<span>Optimized for straightforward answers</span>
							</li>
							<li class="flex items-start gap-3">
								<CircleCheckBig class="mt-0.5 h-5 w-5 text-green-600" />
								<span>Lowest cost per grading</span>
							</li>
						</ul>
					</Card>

					<!-- Pro Mode -->
					<Card
						size="xl"
						class="border-2 border-primary-500 p-6 transition-all duration-300 hover:shadow-xl"
					>
						<div class="mb-4">
							<Heading tag="h3" class="mb-2 text-2xl text-primary-600">Pro Mode</Heading>
							<P class="text-gray-600">Multi-pass validation for the highest accuracy</P>
						</div>
						<Hr class="my-4" />
						<ul class="space-y-3 text-gray-600">
							<li class="flex items-start gap-3">
								<Sparkles class="mt-0.5 h-5 w-5 text-primary-600" />
								<span><strong>Multiple independent AI grading passes</strong></span>
							</li>
							<li class="flex items-start gap-3">
								<Sparkles class="mt-0.5 h-5 w-5 text-primary-600" />
								<span>Majority voting for final decisions</span>
							</li>
							<li class="flex items-start gap-3">
								<Sparkles class="mt-0.5 h-5 w-5 text-primary-600" />
								<span>Confidence scores for every question</span>
							</li>
							<li class="flex items-start gap-3">
								<Sparkles class="mt-0.5 h-5 w-5 text-primary-600" />
								<span>Ideal for subjective or long-form answers</span>
							</li>
						</ul>
					</Card>
				</div>

				<div class="mt-8 text-center">
					<P class="text-gray-600" align="center">
						Pro Mode uses redundancy and consensus — running multiple AI evaluations and
						cross-validating their results — to deliver highly reliable grading with built-in
						confidence metrics.
					</P>
				</div>
			</div>
		</div>
	</div>

	<!-- Privacy and Open Source Section -->
	<div class="bg-gradient-to-r from-secondary-600 to-secondary-700 py-16 text-white">
		<div class="container mx-auto px-4">
			<div class="mx-auto max-w-4xl text-center">
				<Shield class="mx-auto mb-6 h-16 w-16 transition-transform duration-300 hover:rotate-12" />
				<Heading tag="h2" class="mb-4 text-3xl font-bold text-secondary-50 md:text-4xl">
					Privacy & Open Source
				</Heading>
				<P class="mb-8 text-lg text-secondary-50" align="center">
					Full transparency and control: all code is public, and you can self-host for maximum
					privacy. Your data and API keys are handled only by infrastructure you trust.
				</P>

				<div class="grid gap-6 text-left md:grid-cols-3">
					<div
						class="rounded-lg bg-white/10 p-6 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white/20"
					>
						<CircleCheckBig class="mb-3 h-8 w-8" />
						<Heading tag="h4" class="mb-2 text-lg text-secondary-50">Open Source</Heading>
						<P class="text-sm text-secondary-100">
							Inspect, modify, and deploy the app yourself. Self-hosting ensures your exam data and
							API keys are only handled by infrastructure you control.
						</P>
					</div>

					<div
						class="rounded-lg bg-white/10 p-6 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white/20"
					>
						<Shield class="mb-3 h-8 w-8" />
						<Heading tag="h4" class="mb-2 text-lg text-secondary-50">Privacy by Design</Heading>
						<P class="text-sm text-secondary-100">
							No exam data or API keys are stored on our server. You have full control over privacy
							and data handling when you self-host.
						</P>
					</div>

					<div
						class="rounded-lg bg-white/10 p-6 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white/20"
					>
						<Key class="mb-3 h-8 w-8" />
						<Heading tag="h4" class="mb-2 text-lg text-secondary-50">BYOK & Managed Keys</Heading>
						<P class="text-sm text-secondary-100">
							Use your own Gemini API key (BYOK) or choose our managed keys — pick the option that
							fits your workflow while keeping control over costs and access.
						</P>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- CTA Section -->
	<div class="bg-gradient-to-b from-white to-primary-50 py-16">
		<div class="container mx-auto px-4 text-center">
			<Heading tag="h2" class="mb-4 text-3xl font-bold md:text-4xl">
				Ready to Start Grading?
			</Heading>
			<P class="mx-auto mb-8 max-w-2xl text-gray-600" align="center">
				Join teachers and educators who are saving time with AI-powered grading
			</P>
			<Button
				size="xl"
				color="red"
				onclick={startGrading}
				class="w-full transition-all duration-300 hover:scale-105 hover:shadow-lg sm:w-auto"
			>
				<ArrowRight class="mr-2 h-5 w-5" />
				Start Grading Now
			</Button>
		</div>
	</div>

	<!-- Footer -->
	<Hr />
	<footer class="py-8">
		<div class="container mx-auto px-4 text-center text-sm text-gray-600">
			<P>Built by nycu.ai and powered by Google Gemini.</P>
			<P class="mt-2">
				<a
					href="https://github.com/JacobLinCool/written-exam-grader"
					class="text-secondary-600 hover:underline"
					target="_blank"
				>
					View on GitHub
				</a>
			</P>
		</div>
	</footer>
</div>
