import { Heart, MessageCircle, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Social Feed | Mintenance',
  description: 'Connect with other contractors and share your work.',
};

export default function SocialFeedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <Heart className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-navy-900">Social Feed</h1>
      <p className="mx-auto mt-3 max-w-md text-base text-navy-500">
        Share your completed projects, connect with fellow contractors, and grow your professional network.
      </p>
      <div className="mt-8 flex items-center gap-8 text-sm text-navy-400">
        <div className="flex flex-col items-center gap-1">
          <MessageCircle className="h-5 w-5" />
          <span>Posts</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Users className="h-5 w-5" />
          <span>Network</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Heart className="h-5 w-5" />
          <span>Likes</span>
        </div>
      </div>
      <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-6 py-3 text-sm font-medium text-amber-700">
        Coming soon — this feature is under development.
      </div>
      <Link
        href="/contractor/dashboard"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700"
      >
        Back to Dashboard <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
