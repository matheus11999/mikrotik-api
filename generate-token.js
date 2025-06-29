#!/usr/bin/env node

/**
 * Gerador de token seguro para API MikroTik
 * 
 * Este script gera um token criptograficamente seguro para uso na API.
 * O token é gerado usando crypto.randomBytes para máxima segurança.
 */

const crypto = require('crypto');

function generateSecureToken(length = 64) {
    return crypto.randomBytes(length).toString('hex');
}

function generateApiKey(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(0, chars.length);
        result += chars[randomIndex];
    }
    
    return result;
}

console.log('='.repeat(60));
console.log('🔐 GERADOR DE TOKEN SEGURO - API MIKROTIK VPS2');
console.log('='.repeat(60));
console.log();

console.log('📋 TOKENS GERADOS:');
console.log();

// Token principal (hexadecimal, 64 bytes = 128 caracteres)
const mainToken = generateSecureToken(64);
console.log('🔑 Token Principal (recomendado):');
console.log(`   ${mainToken}`);
console.log();

// Token alternativo (alfanumérico, 64 caracteres)
const altToken = generateApiKey(64);
console.log('🗝️  Token Alternativo (alfanumérico):');
console.log(`   ${altToken}`);
console.log();

// Token mais curto (32 caracteres mínimo)
const shortToken = generateApiKey(32);
console.log('⚡ Token Curto (mínimo 32 chars):');
console.log(`   ${shortToken}`);
console.log();

console.log('📝 INSTRUÇÕES:');
console.log();
console.log('1. Copie um dos tokens acima');
console.log('2. Adicione ao seu arquivo .env:');
console.log('   API_TOKEN=seu_token_aqui');
console.log();
console.log('3. Reinicie o servidor da API');
console.log();
console.log('4. Para testar, use o token no header Authorization:');
console.log('   Authorization: Bearer seu_token_aqui');
console.log();

console.log('⚠️  SEGURANÇA:');
console.log();
console.log('• NUNCA compartilhe ou versione o token');
console.log('• Use HTTPS em produção');
console.log('• Troque o token periodicamente');
console.log('• Monitore logs de acesso suspeito');
console.log();

console.log('✅ Tokens gerados com sucesso!');
console.log('='.repeat(60));