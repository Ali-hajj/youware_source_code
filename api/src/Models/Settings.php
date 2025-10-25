<?php

declare(strict_types=1);

namespace App\Models;

final class Settings extends BaseModel
{
    private string $table = 'app_settings';

    /**
     * Fetch the application settings.
     * Since you expect only one row, limit 1.
     *
     * @return array|null
     */
    public function get(): ?array
{
    $stmt = $this->db->prepare("SELECT * FROM {$this->table} LIMIT 1");
    $stmt->execute();
    $settings = $stmt->fetch();
    return $settings ?: null;
}
    /**
     * Update settings with provided data.
     * Expects keys matching frontend format (camelCase) and maps them to DB columns.
     *
     * @param array $data
     * @return bool Success status
     */
    
    public function update(array $data)
    {
        // Correct way: use snake_case keys
        $sql = "UPDATE {$this->table} SET 
                    store_name = :store_name,
                    store_email = :store_email,
                    store_phone = :store_phone,
                    store_address = :store_address,
                    application_title = :application_title,
                    application_subtitle = :application_subtitle,
                    logo = :logo,
                    theme_color = :theme_color,
                    background_color = :background_color,
                    text_color = :text_color,
                    highlight_text_color = :highlight_text_color
                WHERE id = :id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':store_name' => $data['store_name'],
            ':store_email' => $data['store_email'],
            ':store_phone' => $data['store_phone'],
            ':store_address' => $data['store_address'],
            ':application_title' => $data['application_title'],
            ':application_subtitle' => $data['application_subtitle'],
            ':logo' => $data['logo'],
            ':theme_color' => $data['theme_color'],
            ':background_color' => $data['background_color'],
            ':text_color' => $data['text_color'],
            ':highlight_text_color' => $data['highlight_text_color'],
            ':id' => $data['id'],
        ]);

        return true;
    }
}
