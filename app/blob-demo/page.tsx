import AnimatedBlob from '@/components/known/AnimatedBlob'

const SEED = 'u_played-2826-deliberate-autonomous'

export default function BlobDemo() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="flex flex-wrap gap-12 items-center justify-center">
        <AnimatedBlob seed={SEED} hueOffset={0}  word="Deliberate" />
        <AnimatedBlob seed={SEED} hueOffset={5}  word="Autonomous" />
        <AnimatedBlob seed={SEED} hueOffset={10} word="Reflective" />
      </div>
    </div>
  )
}
