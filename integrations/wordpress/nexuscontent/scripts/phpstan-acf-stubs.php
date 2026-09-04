<?php

/** @return mixed */
function acf_get_setting( string $name ) {}

/** @param array<string, mixed> $field_group */
function acf_add_local_field_group( array $field_group ): void {}

/** @param array<string, mixed> $block */
function acf_register_block_type( array $block ): void {}

/** @return mixed */
function acf_get_field_type( string $type ) {}

/** @return mixed */
function get_field( string $selector, int|string|false $post_id = false, bool $format_value = true ) {}

/** @return array<string, mixed>|false */
function get_fields( int|false $post_id = false, bool $format_value = true ) {}
