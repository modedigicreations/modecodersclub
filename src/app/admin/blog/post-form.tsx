import { BlogEditor } from "@/components/blog-editor";
import { CoverImageField } from "@/components/cover-image-field";
import { BLOG_EXCERPT_MAX, BLOG_TITLE_MAX, EMPTY_DOC } from "@/lib/blog";
import { saveBlogPost } from "./actions";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string | null;
  tags: string[];
  content: unknown;
  publishedAt: Date | null;
};

export function PostForm({ post }: { post?: Post }) {
  return (
    <form className="admin-form blog-form" action={saveBlogPost.bind(null, post?.id ?? null)}>
      <label>
        Title *
        <input name="title" required maxLength={BLOG_TITLE_MAX} defaultValue={post?.title} placeholder="e.g. 5 projects to build this holiday" />
      </label>
      <BlogEditor name="content" initialContent={post?.content ?? EMPTY_DOC} />
      <details className="blog-form-extra" open={!post}>
        <summary>Cover image, summary, tags and web address</summary>
        <label>
          Summary (shown on the blog list and when shared; left empty, it&rsquo;s taken from the post)
          <textarea name="excerpt" rows={2} maxLength={BLOG_EXCERPT_MAX} defaultValue={post?.excerpt} />
        </label>
        <CoverImageField name="coverImageUrl" initialUrl={post?.coverImageUrl ?? null} />
        <label>
          Tags (comma separated)
          <input name="tags" defaultValue={post?.tags.join(", ")} placeholder="events, javascript, tips" />
        </label>
        <label>
          Web address: /blog/
          <input name="slug" defaultValue={post?.slug} placeholder="made from the title" maxLength={60} />
        </label>
      </details>
      <div className="blog-form-actions">
        {post?.publishedAt ? (
          <button type="submit" name="intent" value="publish" className="button button-primary">Save changes</button>
        ) : (
          <>
            <button type="submit" name="intent" value="draft" className="button">Save draft</button>
            <button type="submit" name="intent" value="publish" className="button button-primary">Publish</button>
          </>
        )}
      </div>
    </form>
  );
}
