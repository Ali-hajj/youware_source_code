<?php

declare(strict_types=1);

namespace App\Support;

use Respect\Validation\Exceptions\NestedValidationException;
use Respect\Validation\Validator as v;

final class Validator
{
    public static function validate(array $data, array $rules)
    {
        $messages = [];
        $hasErrors = false;

        foreach ($rules as $field => $rule) {
            try {
                $value = $data[$field] ?? null;
                $rule->setName(ucfirst(str_replace('_', ' ', $field)))->assert($value);
            } catch (NestedValidationException $e) {
                $messages[$field] = $e->getMessages();
                $hasErrors = true;
            }
        }

        return new class($hasErrors, $messages) {
            public function __construct(private bool $fails, private array $messages)
            {
            }

            public function fails(): bool
            {
                return $this->fails;
            }

            public function messages(): array
            {
                return $this->messages;
            }
        };
    }
}
