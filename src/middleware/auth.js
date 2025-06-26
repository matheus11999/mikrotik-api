const authenticateApiToken = (req, res, next) => {
    // Se não há token configurado, pula a autenticação
    if (!process.env.API_TOKEN) {
        console.log(`[AUTH] [${new Date().toISOString()}] API_TOKEN não configurado, pulando autenticação`);
        return next();
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : null;

    console.log(`[AUTH] [${new Date().toISOString()}] Verificando autenticação para ${req.method} ${req.url}`);

    if (!token) {
        console.error(`[AUTH] [${new Date().toISOString()}] Token não fornecido`);
        return res.status(401).json({
            error: "Authentication required",
            message: "Please provide a valid Bearer token",
            timestamp: new Date().toISOString()
        });
    }

    if (token !== process.env.API_TOKEN) {
        console.error(`[AUTH] [${new Date().toISOString()}] Token inválido fornecido`);
        return res.status(401).json({
            error: "Invalid token",
            message: "The provided token is invalid",
            timestamp: new Date().toISOString()
        });
    }

    console.log(`[AUTH] [${new Date().toISOString()}] Autenticação bem-sucedida`);
    next();
};

module.exports = {
    authenticateApiToken
}; 