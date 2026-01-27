import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import PageLayout from "@/layouts/PageLayout";
import Section from "@/components/Section";
import Seo from "@/components/Seo";
import { getBlogPostById, getBlogData } from "@/lib/blog";

import styles from "./Page.module.scss";
import Badges from "@/components/Blog/components/Badges";
import SubscriptionForm from "./SubscriptionFormWrapper";
import { RECAPTCHA_SITE_KEY, CUSTOM_FORM_URL } from "@/constants";
import RichText from "@dexilion/payload-pms/RichText";

const PostPage = async ({ params }: { params: { id: number } }) => {
  const { id } = params;
  const [post, { posts: allPosts, tags: allTags }] = await Promise.all([
    getBlogPostById(id),
    getBlogData(),
  ]);

  if (!post) {
    notFound();
  }

  const { title, content, date, author, featuredImage, tags } = post;

  // Get latest 4 posts excluding current post
  const latestPosts = allPosts
    .filter((p: any) => p.id.toString() !== id)
    .slice(0, 4);

  return (
    <PageLayout withCoopeartionRoadMap={true} withContact={false}>
      <Seo
        title={`${title ?? "Blog Post"} | Cursor Insight`}
        description={post.excerpt?.replace(/<[^>]+>/g, "").slice(0, 160)}
      />

      <Section className={`my-5 ${styles.Post}`}>
        <div className="container">
          <div className="row">
            {/* Main Content */}
            <div className="col-12 col-lg-8">
              <Link href="/blog" className={styles.BackLink}>
                <span className={styles.BackArrow}>←</span> Back to the blog
              </Link>

              <h1
                className={styles.PostTitle}
                dangerouslySetInnerHTML={{ __html: title }}
              />

              {/* Tags under title */}
              {tags && tags.length > 0 && (
                <div className={styles.PostMetadata}>
                  <div className={styles.PostTags}>
                    {tags.map((tag: any, index: number) => (
                      <span key={tag.id}>
                        <Link href={tag.link} className={styles.PostTagLink}>
                          {tag.name.toUpperCase()}
                        </Link>
                        {index < tags.length - 1 && ", "}
                      </span>
                    ))}
                  </div>
                  <div className={styles.PostDots} />
                  <div className={styles.PostCopyLink}>
                    <i className={`fa fa-chain fa-lg`} />
                  </div>
                </div>
              )}

              {/* Author info with avatar */}
              <div className={styles.AuthorInfo}>
                {author?.avatar && (
                  <Image
                    src={author.avatar}
                    alt={author.name || "Author"}
                    width={40}
                    height={40}
                    className={styles.AuthorAvatar}
                  />
                )}
                <div className={styles.AuthorDetails}>
                  {author?.name && (
                    <span className={styles.AuthorName}>{author.name}</span>
                  )}
                  {date && <span className={styles.PostDate}>{date}</span>}
                </div>
              </div>

              {featuredImage && (
                <div className="mb-4">
                  <Image
                    src={featuredImage.url}
                    alt={title ?? "Post image"}
                    width={800}
                    height={450}
                    style={{ width: "100%", height: "auto" }}
                    className={styles.FeaturedImage}
                    priority
                  />
                </div>
              )}

              <RichText content={content} />

              <SubscriptionForm
                action={CUSTOM_FORM_URL}
                styles={styles}
                responseMessage="Thank you for subscribing!"
                captchaType="recaptcha"
                captchaSiteKey={RECAPTCHA_SITE_KEY}
                afterSubmitCallback={undefined}
              />
            </div>

            {/* Sidebar */}
            <div className="col-12 col-lg-4 mt-5 mt-lg-0">
              {/* Tags Section */}
              <div className={styles.Sidebar}>
                <h3 className={styles.SidebarTitle}>Tags</h3>
                <div className={styles.TagsContainer}>
                  <Badges badges={allTags} />
                </div>
              </div>

              {/* Latest Posts Section */}
              <div className={styles.Sidebar}>
                <h3 className={styles.SidebarTitle}>Latest Posts</h3>
                <div className={styles.LatestPosts}>
                  {latestPosts.map((latestPost: any) => (
                    <div key={latestPost.id}>
                      <Link
                        href={latestPost.link}
                        className={styles.LatestPostCard}
                      >
                        <h5
                          className={styles.LatestPostTitle}
                          dangerouslySetInnerHTML={{
                            __html: latestPost.title,
                          }}
                        />
                        {latestPost.featuredImage && (
                          <Image
                            src={latestPost.featuredImage.url}
                            alt={latestPost.title ?? "Post image"}
                            width={300}
                            height={170}
                            className={styles.LatestPostImage}
                          />
                        )}
                        <div
                          className={styles.LatestPostExcerpt}
                          dangerouslySetInnerHTML={{
                            __html: latestPost.excerpt,
                          }}
                        />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </PageLayout>
  );
};

export default PostPage;
