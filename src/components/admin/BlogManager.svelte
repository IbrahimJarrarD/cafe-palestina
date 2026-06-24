<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../../lib/supabase';

  let posts: any[] = [];
  let loading = true;
  let error = '';
  let deletingId: string | null = null;

  onMount(load);

  // Fetch ALL posts (incl. drafts) with the admin session. Anon SSR cannot read
  // drafts via RLS, so this list must run client-side.
  async function load() {
    loading = true;
    error = '';
    const { data, error: loadError } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (loadError) {
      error = 'Failed to load posts: ' + loadError.message;
    }
    posts = data || [];
    loading = false;
  }

  function formatDate(value: string | null) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  async function deletePost(post: any) {
    if (!confirm(`Delete "${post.title_en || post.title_de}"? This cannot be undone.`)) {
      return;
    }
    deletingId = post.id;
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', post.id);
    deletingId = null;
    if (deleteError) {
      alert('Error deleting post: ' + deleteError.message);
      return;
    }
    posts = posts.filter((p) => p.id !== post.id);
  }
</script>

<div class="blog-page">
  <div class="page-header">
    <p class="subtitle">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</p>
    <a href="/admin/blog/new" class="btn btn-primary"><span>+</span> New Post</a>
  </div>

  {#if error}
    <p class="error-banner">{error}</p>
  {/if}

  {#if loading}
    <p class="loading">Loading posts…</p>
  {:else}
    <div class="table-container">
      <table class="blog-table">
        <thead>
          <tr>
            <th>Post</th>
            <th>Status</th>
            <th>Published</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if posts.length > 0}
            {#each posts as post (post.id)}
              <tr>
                <td>
                  <div class="post-cell">
                    {#if post.cover_image_url}
                      <img src={post.cover_image_url} alt="" class="post-thumb" />
                    {:else}
                      <div class="post-thumb placeholder">📝</div>
                    {/if}
                    <div class="post-info">
                      <span class="post-title">{post.title_en || post.title_de}</span>
                      <span class="post-slug">/blog/{post.slug}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class={`status-badge ${post.status === 'published' ? 'published' : 'draft'}`}>
                    {post.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td><span class="date">{formatDate(post.published_at)}</span></td>
                <td>
                  <div class="actions">
                    <a href={`/admin/blog/${post.id}`} class="action-btn edit" title="Edit">✏️</a>
                    <button
                      class="action-btn delete"
                      title="Delete"
                      on:click={() => deletePost(post)}
                      disabled={deletingId === post.id}
                    >🗑️</button>
                  </div>
                </td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="4" class="empty-state">
                <p>No posts yet</p>
                <a href="/admin/blog/new" class="btn btn-primary">Write your first post</a>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .blog-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .subtitle {
    color: var(--ink-light);
    font-size: 0.9rem;
  }

  .loading {
    color: var(--ink-light);
  }

  .error-banner {
    color: #dc2626;
    font-size: 0.9rem;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    font-size: 0.9rem;
    font-weight: 500;
    border-radius: 8px;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: var(--pine);
    color: white;
  }

  .btn-primary:hover {
    background: var(--pine-light);
  }

  .table-container {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  .blog-table {
    width: 100%;
    border-collapse: collapse;
  }

  .blog-table th {
    text-align: left;
    padding: 1rem 1.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ink-light);
    background: var(--sand-light);
    border-bottom: 1px solid var(--sand);
  }

  .blog-table td {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--sand-light);
    vertical-align: middle;
  }

  .blog-table tr:last-child td {
    border-bottom: none;
  }

  .blog-table tbody tr:hover {
    background: var(--sand-light);
  }

  .post-cell {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .post-thumb {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .post-thumb.placeholder {
    background: var(--sand);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
  }

  .post-info {
    display: flex;
    flex-direction: column;
  }

  .post-title {
    font-weight: 500;
    color: var(--ink);
  }

  .post-slug {
    font-size: 0.8rem;
    color: var(--ink-light);
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-badge.published {
    background: #dcfce7;
    color: #166534;
  }

  .status-badge.draft {
    background: #fef3c7;
    color: #92400e;
  }

  .date {
    color: var(--ink-light);
    font-size: 0.9rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    transition: all 0.2s;
    text-decoration: none;
    background: var(--sand-light);
  }

  .action-btn:hover {
    background: var(--sand);
  }

  .action-btn.delete:hover {
    background: #fecaca;
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--ink-light);
  }

  .empty-state p {
    margin-bottom: 1rem;
  }
</style>
