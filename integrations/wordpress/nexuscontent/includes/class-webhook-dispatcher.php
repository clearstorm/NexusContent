<?php
/**
 * Outbound signed webhook dispatch for page and post content changes.
 *
 * @package NexusContentCompanion
 */

namespace NexusContent\Companion;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Dispatches best-effort, outbound-only change notifications.
 *
 * Webhooks are opt-in: nothing is sent until the consumer configures a
 * `webhook_url` (and, ideally, a shared `nexuscontent_webhook_secret`). The
 * dispatcher never reads, echoes, or logs the shared secret, and it never
 * triggers rebuilds or other site mutations — that decision belongs to the
 * consuming frontend after verifying the signature.
 */
final class Webhook_Dispatcher {
	public const OPTION_SECRET   = 'nexuscontent_webhook_secret';
	public const SETTINGS_KEY    = 'webhook_url';
	public const SETTINGS_OPTION = 'nexuscontent_settings';

	/**
	 * Events emitted when a page or post is created, updated, trashed, or
	 * restored from the trash.
	 */
	private const SUPPORTED_TYPES = array( 'page', 'post' );

	/**
	 * Register the post lifecycle hooks.
	 */
	public function register(): void {
		add_action( 'wp_after_insert_post', array( $this, 'on_after_insert' ), 10, 3 );
		add_action( 'trashed_post', array( $this, 'on_trashed' ) );
		add_action( 'untrashed_post', array( $this, 'on_untrashed' ) );
	}

	/**
	 * @param int    $post_id     Post ID.
	 * @param \WP_Post|null $post    Inserted post object.
	 * @param bool   $update      Whether this is an update of an existing post.
	 */
	public function on_after_insert( int $post_id, $post, bool $update ): void {
		$this->dispatch_event( $update ? 'updated' : 'created', $post_id );
	}

	/**
	 * @param int $post_id Post ID.
	 */
	public function on_trashed( int $post_id ): void {
		$this->dispatch_event( 'trashed', $post_id );
	}

	/**
	 * @param int $post_id Post ID.
	 */
	public function on_untrashed( int $post_id ): void {
		$this->dispatch_event( 'restored', $post_id );
	}

	/**
	 * Dispatch a signed change notification for a supported post.
	 *
	 * No-op when no URL is configured or the post is not a supported type.
	 * Best-effort and non-blocking; failures are never surfaced to the caller.
	 *
	 * @param string $event   One of created, updated, trashed, restored.
	 * @param int    $post_id Post ID.
	 */
	public function dispatch_event( string $event, int $post_id ): void {
		$url = $this->webhook_url();
		if ( '' === $url ) {
			return;
		}

		$post = get_post( $post_id );
		if ( ! $post instanceof \WP_Post || ! in_array( $post->post_type, self::SUPPORTED_TYPES, true ) ) {
			return;
		}

		$body = wp_json_encode(
			array(
				'event'      => $event,
				'id'         => (int) $post->ID,
				'type'       => $post->post_type,
				'slug'       => $post->post_name,
				'status'     => $post->post_status,
				'title'      => $post->post_title,
				'modifiedAt' => gmdate( 'c', strtotime( $post->post_modified_gmt . ' UTC' ) ),
				'source'     => 'wordpress',
			)
		);

		if ( false === $body ) {
			return;
		}

		$headers = array( 'Content-Type' => 'application/json' );
		$secret  = $this->webhook_secret();
		if ( '' !== $secret ) {
			$headers['X-NexusContent-Signature'] = 'sha256=' . hash_hmac( 'sha256', $body, $secret );
		}

		wp_remote_post(
			$url,
			array(
				'headers'     => $headers,
				'body'        => $body,
				'timeout'     => 0.1,
				'blocking'    => false,
				'redirection' => 0,
			)
		);
	}

	/**
	 * Configured webhook URL, or an empty string when disabled.
	 */
	private function webhook_url(): string {
		$settings = get_option( self::SETTINGS_OPTION, array() );
		$url      = is_array( $settings ) ? ( $settings[ self::SETTINGS_KEY ] ?? '' ) : '';
		return is_string( $url ) ? trim( $url ) : '';
	}

	/**
	 * Shared secret for signing, or an empty string when unsigned.
	 */
	private function webhook_secret(): string {
		$secret = get_option( self::OPTION_SECRET, '' );
		return is_string( $secret ) ? trim( $secret ) : '';
	}
}
