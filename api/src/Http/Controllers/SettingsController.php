<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Settings;
use App\Support\JsonResponse;

final class SettingsController
{
    private Settings $settings;

    public function __construct()
    {
        // Create an instance of the Settings model
        $this->settings = new Settings();
    }

    /**
     * Get the app settings.
     *
     * @return array JSON response with settings data or error
     */
   public function index(array $params): array
{
    error_log('SettingsController index method called');

    $settings = $this->settings->get();

    if (!$settings) {
        error_log('Settings not found');
        return JsonResponse::error('Settings not found', 404);
    }

    error_log('Settings found, returning success response');
    return JsonResponse::success(['settings' => $settings]);
}


    /**
     * Update the app settings.
     *
     * @return array JSON response indicating success or failure
     */
    public function update(array $params): array
{
    if (!isset($params['input']) || !is_array($params['input'])) {
        return JsonResponse::error('Missing or invalid input data', 400);
    }

    $input = $params['input'];

    $mappedInput = [
        'id' => $input['id'] ?? null,
        'store_name' => $input['storeName'] ?? null,
        'store_email' => $input['storeEmail'] ?? null,
        'store_phone' => $input['storePhone'] ?? null,
        'store_address' => $input['storeAddress'] ?? null,
        'application_title' => $input['applicationTitle'] ?? null,
        'application_subtitle' => $input['applicationSubtitle'] ?? null,
        'logo' => $input['logo'] ?? '',
        'theme_color' => $input['themeColor'] ?? null,
        'background_color' => $input['backgroundColor'] ?? null,
        'text_color' => $input['textColor'] ?? null,
        'highlight_text_color' => $input['highlightTextColor'] ?? null,
    ];

    if (empty($mappedInput['store_name'])) {
        return JsonResponse::error('The store_name field is required.', 400);
    }

    try {
        $settingsModel = new Settings();

        // 🔥 THIS LINE IS KEY 🔥
        // Make sure you're passing $mappedInput, not $params or $input
        $updated = $settingsModel->update($mappedInput);

        if (!$updated) {
            return JsonResponse::error('Failed to update settings', 500);
        }

        return JsonResponse::success(['settings' => $updated]);
    } catch (\Exception $e) {
        error_log('Settings update error: ' . $e->getMessage());
        return JsonResponse::error('Database error: ' . $e->getMessage(), 500);
    }
}
}
