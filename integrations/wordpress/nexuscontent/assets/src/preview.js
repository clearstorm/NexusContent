( function ( wp, settings, apiFetch ) {
	'use strict';

	if (
		! wp ||
		! settings ||
		! wp.plugins ||
		! wp.editPost ||
		! wp.data ||
		! wp.components ||
		! wp.element ||
		! apiFetch
	) {
		return;
	}

	const el = wp.element.createElement;
	const { useState, useCallback } = wp.element;
	const { Button, Spinner, Notice } = wp.components;

	// The nonce is embedded in the settings by the server and is required only
	// for cookie-authenticated requests. apiFetch adds it automatically from
	// the registered REST root global, so we only pass the body here.
	function mintPreviewUrl( postId ) {
		return apiFetch( {
			path: settings.restRoot + 'preview-token',
			method: 'POST',
			data: { postId },
		} )
			.then( function ( envelope ) {
				const data = envelope && envelope.data ? envelope.data : {};
				return {
					url: data.previewUrl || '',
					error: null,
				};
			} )
			.catch( function ( error ) {
				const message =
					( error && error.message ) || settings.labels.fetchError;
				return { url: '', error: message };
			} );
	}

	function PreviewButton() {
		const [ state, setState ] = useState( {
			busy: false,
			error: '',
			done: false,
		} );
		const postId = wp.data.useSelect( function ( select ) {
			return select( 'core/editor' ).getCurrentPostId
				? select( 'core/editor' ).getCurrentPostId()
				: 0;
		}, [] );
		const isSaving = wp.data.useSelect( function ( select ) {
			return select( 'core/editor' ).isSavingPost
				? select( 'core/editor' ).isSavingPost()
				: false;
		}, [] );

		const onPreview = useCallback(
			function () {
				if ( ! postId ) {
					return;
				}
				setState( { busy: true, error: '', done: false } );
				mintPreviewUrl( postId ).then( function ( result ) {
					if ( result.error ) {
						setState( {
							busy: false,
							error: result.error,
							done: false,
						} );
						return;
					}
					if ( ! result.url ) {
						setState( {
							busy: false,
							error: settings.labels.noPreviewUrl,
							done: false,
						} );
						return;
					}
					window.open( result.url, '_blank', 'noopener' );
					setState( { busy: false, error: '', done: true } );
				} );
			},
			[ postId ]
		);

		const disabled =
			! postId || isSaving || state.busy || ! settings.previewFrontendUrl;

		return el(
			wp.editPost.PluginDocumentSettingPanel,
			{ name: 'nexuscontent-preview', title: settings.labels.panel },
			el( 'p', {}, settings.labels.description ),
			el(
				Button,
				{
					variant: 'secondary',
					onClick: onPreview,
					disabled,
					style: { width: '100%', justifyContent: 'center' },
				},
				state.busy ? el( Spinner, {} ) : settings.labels.button
			),
			! settings.previewFrontendUrl
				? el(
						Notice,
						{ isDismissible: false, status: 'warning' },
						settings.labels.noConfig
				  )
				: null,
			state.error
				? el(
						Notice,
						{ isDismissible: false, status: 'error' },
						state.error
				  )
				: null,
			state.done
				? el(
						Notice,
						{ isDismissible: false, status: 'success' },
						settings.labels.opened
				  )
				: null
		);
	}

	wp.plugins.registerPlugin( 'nexuscontent-preview', {
		render: PreviewButton,
		icon: 'welcome-view-site',
	} );
} )( window.wp, window.NexusContentPreviewSettings, window.wp.apiFetch );
