const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const Promise = require('bluebird');


function createJWT(username, role) {
    return jwt.sign({
        username,
        role,
    }, 'thisisasecret', {
        expiresIn: '1d'
    })
}

jwt.verify = Promise.promisify(jwt.verify); // Turn jwt.verify into a function that returns a promise

function verifyTokenAndReturnPayload(token) {
    return jwt.verify(token, 'thisisasecret');
}

function validateToken(req, res, next) {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader.startsWith("Bearer ")) {
        return res.status(400).json({ message: "There is no token in header" });
    }

    const token = authHeader.split(" ")[1];

    verifyTokenAndReturnPayload(token).then((payload) => {

        req.username = payload.username;
        req.role = payload.role;

        // console.log(req.username);
        // console.log(req.role);

        console.log("TOKEN MIDDLE WARE APPROVED");
        next();
    }
    ).catch((err) => { console.log(err) });

}

function validateUsernameAndPassword(req, res, next) {
    const reqBody = req.body;

    if ((reqBody.username == null) || (reqBody.password == null)) {
        return res.status(400).json({ message: "There is no username and password property" });
    }
    else if ((reqBody.username == "") || (reqBody.password == "")) {
        return res.status(400).json({ message: 'You need to type in a username and password!' });
    }
    else {
        req.username = reqBody.username;
        req.password = reqBody.password;

        console.log("USERNAME AND PASSWORD MIDDLE WARE APPROVED");
        next();
    }
}

function validateEmployee(req, res, next) {
    // const reqBody = req.body;
    const reqRole = req.role

    if (!reqRole) {
        return res.status(400).json({ message: 'You have no role.' });
    }
    else if (reqRole === 'employee') {
        console.log("EMPLOYEE MIDDLE WARE APPROVED");
        next();
    }
    else {
        return res.status(400).json({ message: `You are not an employee, you are a/an ${reqRole}` });
    }
}

function validateManager(req, res, next) {
    // const reqBody = req.body;
    const reqRole = req.role

    if (!reqRole) {
        return res.status(400).json({ message: 'You have no role.' });
    }
    else if (reqRole === 'manager') {
        console.log("MANAGER MIDDLE WARE APPROVED");
        next();
    }
    else {
        return res.status(400).json({ message: `You are not an manager, you are a/an ${reqRole}` });
    }
}

function validateTicket(req, res, next) {
    const reqBody = req.body;

    if ((reqBody.amount == null) || (reqBody.description == null)) {
        return res.status(400).json({ message: 'It does not have an amount and description property!' });
    }
    else if ((reqBody.amount == "") || (reqBody.description == "")) {
        return res.status(400).json({ message: 'You need to type in an amount and a description' });
    }
    else {
        req.amount = reqBody.amount;
        req.description = reqBody.description;

        console.log("TICKET MIDDLE WARE APPROVED");
        next();
    }
}

function validateRole(req, res, next) {
    const reqBody = req.body;

    if ((reqBody.role == null)) {
        return res.status(400).json({ message: 'It does not have a role property!' });
    }
    else if ((reqBody.role == "")) {
        return res.status(400).json({ message: 'You need to type in a role!' });
    }
    else if ((reqBody.role == "employee") || (reqBody.role == "manager")) {
        req.roleToAssign = reqBody.role;

        console.log("ROLE MIDDLE WARE APPROVED");
        next();

    }
    else {
        return res.status(400).json({ message: 'The role is not an employee or manager!' });
    }
}

function validateQuery(req, res, next) {
    const reqQuery = req.query;

    if ((reqQuery.id == null) || (reqQuery == null)) {
        return res.status(400).json({ message: 'No query id.' });
    }
    else if (reqQuery.id == "") {
        return res.status(400).json({ message: 'You need to type in a query id.' });
    }
    else {
        req.queryId = reqQuery.id;

        console.log("QUERY MIDDLE WARE APPROVED");
        next();
    }
}

function validateTicketStatus(req, res, next) {
    const reqBody = req.body;

    if ((reqBody.status == null)) {
        return res.status(400).json({ message: 'It does not have a status property!' });
    }
    else if ((reqBody.status == "")) {
        return res.status(400).json({ message: 'You need to type in an approved or denied status!' });
    }
    else if ((reqBody.status == "approved") || (reqBody.status == "denied")) {
        req.status = reqBody.status;

        console.log("STATUS MIDDLE WARE APPROVED");
        next();

    }
    else {
        return res.status(400).json({ message: 'The status is not approved or denied!' });
    }
}

module.exports = {
    createJWT,
    validateToken,
    validateUsernameAndPassword,
    validateEmployee,
    validateManager,
    validateTicket,
    validateRole,
    validateQuery,
    validateTicketStatus
};