<?php

namespace NexusContent\Companion\Tests\Unit;

require_once dirname( __DIR__ ) . '/bootstrap.php';
require_once dirname( __DIR__ ) . '/TestCase.php';

use NexusContent\Companion\Tests\TestCase;
use NexusContent\Companion\Webhook_Dispatcher;

final class WebhookDispatcherTest extends TestCase {
	public function test_register_hooks_lifecycle(): void {
		$dispatcher = new Webhook_Dispatcher();
		$dispatcher->register();

		self::assertArrayHasKey( 'wp_after_insert_post', $GLOBALS['nc_test']['actions'] );
		self::assertArrayHasKey( 'trashed_post', $GLOBALS['nc_test']['actions'] );
		self::assertArrayHasKey( 'untrashed_post', $GLOBALS['nc_test']['actions'] );
	}

	public function test_dispatch_is_noop_without_url(): void {
		$dispatcher = new Webhook_Dispatcher();
		$dispatcher->register();
		$this->post();
		do_action( 'wp_after_insert_post', 42, $this->post(), false );
		self::assertSame( array(), $GLOBALS['nc_test']['webhooks'] );
	}

	public function test_dispatch_event_sends_unsigned_payload(): void {
		$GLOBALS['nc_test']['options'][ Webhook_Dispatcher::SETTINGS_OPTION ] = array( 'webhook_url' => 'https://frontend.example.com/_nexus/webhook' );
		$dispatcher = new Webhook_Dispatcher();
		$dispatcher->register();

		do_action( 'wp_after_insert_post', 42, $this->post( array( 'post_name' => 'created-page' ) ), false );

		self::assertCount( 1, $GLOBALS['nc_test']['webhooks'] );
		$sent = $GLOBALS['nc_test']['webhooks'][0];
		self::assertSame( 'https://frontend.example.com/_nexus/webhook', $sent['url'] );
		self::assertSame( false, $sent['args']['blocking'] );

		$body   = json_decode( $sent['args']['body'], true );
		self::assertSame( 'created', $body['event'] );
		self::assertSame( 'page', $body['type'] );
		self::assertSame( 42, $body['id'] );
		self::assertSame( 'created-page', $body['slug'] );
		self::assertSame( 'wordpress', $body['source'] );
		self::assertArrayNotHasKey( 'X-NexusContent-Signature', $sent['args']['headers'] );
	}

	public function test_dispatch_event_signs_payload_with_secret(): void {
		$GLOBALS['nc_test']['options'][ Webhook_Dispatcher::SETTINGS_OPTION ] = array( 'webhook_url' => 'https://frontend.example.com/_nexus/webhook' );
		$GLOBALS['nc_test']['options'][ Webhook_Dispatcher::OPTION_SECRET ]    = 'shared-secret';
		$dispatcher = new Webhook_Dispatcher();
		$dispatcher->register();
		$this->post( array( 'post_status' => 'trash' ) );

		do_action( 'trashed_post', 42 );

		self::assertCount( 1, $GLOBALS['nc_test']['webhooks'] );
		$sent  = $GLOBALS['nc_test']['webhooks'][0];
		$body  = $sent['args']['body'];
		$signature = $sent['args']['headers']['X-NexusContent-Signature'];
		self::assertSame( 'sha256=' . hash_hmac( 'sha256', $body, 'shared-secret' ), $signature );
	}

	public function test_dispatch_ignores_unsupported_post_type(): void {
		$GLOBALS['nc_test']['options'][ Webhook_Dispatcher::SETTINGS_OPTION ] = array( 'webhook_url' => 'https://frontend.example.com/_nexus/webhook' );
		$dispatcher = new Webhook_Dispatcher();
		$dispatcher->register();

		$this->post( array( 'post_type' => 'product' ) );
		do_action( 'wp_after_insert_post', 42, $this->post( array( 'post_type' => 'product' ) ), false );

		self::assertSame( array(), $GLOBALS['nc_test']['webhooks'] );
	}
}
