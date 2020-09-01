import { createHmac } from 'crypto'

export function hashPassword(password: string, salt: string) {
    return createHmac('sha256',salt).update(password).digest('base64');
}