/**
 * @openapi
 * components:
 *   schemas:
 *     UserRole:
 *       type: string
 *       enum: [ADMIN, REFEREE, TECHNICAL_DIRECTOR, ASSISTANT, PLAYER]
 *       description: Role assigned at registration. Determines access to admin endpoints.
 *
 *     User:
 *       type: object
 *       description: Public user representation (no password hash, internal file paths).
 *       properties:
 *         id: { type: string, format: uuid }
 *         firstName: { type: string, maxLength: 100 }
 *         paternalSurname: { type: string, maxLength: 100 }
 *         maternalSurname: { type: string, maxLength: 100 }
 *         birthDate: { type: string, format: date, example: '1995-04-12' }
 *         age:
 *           type: integer
 *           description: Computed server-side from `birthDate`.
 *           readOnly: true
 *         role: { $ref: '#/components/schemas/UserRole' }
 *         nickname: { type: string, nullable: true, maxLength: 80 }
 *         phoneNumber:
 *           type: string
 *           example: '+525512345678'
 *           description: E.164 preferred (10–15 digits, optional leading +).
 *         email: { type: string, format: email, maxLength: 255 }
 *         curp:
 *           type: string
 *           minLength: 18
 *           maxLength: 18
 *           pattern: '^[A-Z]{4}[0-9]{6}[A-Z]{6}[0-9]{2}$'
 *           description: Mexican CURP (18 alphanumeric chars).
 *         isActive: { type: boolean }
 *         profilePhotoUrl: { type: string, format: uri, nullable: true }
 *         coverPhotoUrl:   { type: string, format: uri, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         createdById: { type: string, format: uuid, nullable: true }
 *         updatedAt: { type: string, format: date-time }
 *         updatedById: { type: string, format: uuid, nullable: true }
 *         deletedAt:  { type: string, format: date-time, nullable: true }
 *       required:
 *         - id
 *         - firstName
 *         - paternalSurname
 *         - maternalSurname
 *         - birthDate
 *         - role
 *         - phoneNumber
 *         - email
 *         - curp
 *         - isActive
 *
 *     Field:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string, maxLength: 100 }
 *         address: { type: string, nullable: true, maxLength: 255 }
 *         description: { type: string, nullable: true, maxLength: 1000 }
 *         capacity: { type: integer, nullable: true, minimum: 1 }
 *         isActive: { type: boolean }
 *         createdAt:  { type: string, format: date-time }
 *         createdById: { type: string, format: uuid, nullable: true }
 *         updatedAt:  { type: string, format: date-time }
 *         updatedById: { type: string, format: uuid, nullable: true }
 *       required: [id, name, isActive]
 *
 *     League:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string, maxLength: 100 }
 *         description: { type: string, nullable: true, maxLength: 1000 }
 *         season: { type: string, nullable: true, maxLength: 50 }
 *         startDate: { type: string, format: date, nullable: true }
 *         endDate:   { type: string, format: date, nullable: true }
 *         isActive: { type: boolean }
 *         fieldIds:
 *           type: array
 *           items: { type: string, format: uuid }
 *         createdAt:  { type: string, format: date-time }
 *         createdById: { type: string, format: uuid, nullable: true }
 *         updatedAt:  { type: string, format: date-time }
 *         updatedById: { type: string, format: uuid, nullable: true }
 *       required: [id, name, isActive, fieldIds]
 *
 *     AuthSuccess:
 *       type: object
 *       description: Returned by register, login and refresh. The refresh token is also set as an HttpOnly cookie.
 *       properties:
 *         user: { $ref: '#/components/schemas/User' }
 *         accessToken:
 *           type: string
 *           description: "Short-lived JWT. Send as `Authorization: Bearer <token>` on protected routes."
 *         refreshToken:
 *           type: string
 *           description: Opaque token. Normally delivered as the `kaibil_rt` HttpOnly cookie; the body copy is informational.
 *       required: [user, accessToken, refreshToken]
 *
 *     SuccessEnvelope:
 *       type: object
 *       description: Standard success response wrapper used by every endpoint.
 *       properties:
 *         success:    { type: boolean, example: true }
 *         statusCode: { type: integer, example: 200 }
 *         data:       { type: object, additionalProperties: true }
 *       required: [success, statusCode, data]
 *
 *     ErrorEnvelope:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: false }
 *         statusCode: { type: integer, example: 400 }
 *         error:
 *           type: object
 *           properties:
 *             code:    { type: string, example: 'VALIDATION_ERROR' }
 *             message: { type: string, example: 'Invalid request payload' }
 *           required: [code, message]
 *       required: [success, statusCode, error]
 *
 *     ValidationErrorEnvelope:
 *       allOf:
 *         - $ref: '#/components/schemas/ErrorEnvelope'
 *         - type: object
 *           properties:
 *             error:
 *               type: object
 *               properties:
 *                 code:    { type: string, example: 'VALIDATION_ERROR' }
 *                 message: { type: string, example: 'Invalid request payload' }
 *                 issues:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:    { type: array, items: { type: string }, example: ['email'] }
 *                       message: { type: string, example: 'Invalid email' }
 *
 *     RegisterRequest:
 *       type: object
 *       required: [firstName, paternalSurname, maternalSurname, birthDate, phoneNumber, email, curp, password]
 *       properties:
 *         firstName:       { type: string, minLength: 2, maxLength: 100 }
 *         paternalSurname: { type: string, minLength: 2, maxLength: 100 }
 *         maternalSurname: { type: string, minLength: 2, maxLength: 100 }
 *         birthDate:       { type: string, format: date, example: '1995-04-12' }
 *         role:            { $ref: '#/components/schemas/UserRole' }
 *         nickname:        { type: string, maxLength: 80 }
 *         phoneNumber:     { type: string, example: '+525512345678' }
 *         email:           { type: string, format: email, maxLength: 255 }
 *         curp:            { type: string, pattern: '^[A-Z]{4}[0-9]{6}[A-Z]{6}[0-9]{2}$' }
 *         password:
 *           type: string
 *           minLength: 8
 *           description: Minimum 8 chars, at least one letter and one digit.
 *
 *     LoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:    { type: string, format: email }
 *         password: { type: string, minLength: 1 }
 *
 *     UpdateUserRequest:
 *       type: object
 *       description: Partial update. Extra fields are rejected (`.strict()`).
 *       additionalProperties: false
 *       properties:
 *         firstName:       { type: string, minLength: 2, maxLength: 100 }
 *         paternalSurname: { type: string, minLength: 2, maxLength: 100 }
 *         maternalSurname: { type: string, minLength: 2, maxLength: 100 }
 *         birthDate:       { type: string, format: date }
 *         nickname:        { type: string, nullable: true, maxLength: 80 }
 *         phoneNumber:     { type: string, example: '+525512345678' }
 *
 *     CreateFieldRequest:
 *       type: object
 *       required: [name]
 *       properties:
 *         name:        { type: string, minLength: 2, maxLength: 100 }
 *         address:     { type: string, maxLength: 255, nullable: true }
 *         description: { type: string, maxLength: 1000, nullable: true }
 *         capacity:    { type: integer, minimum: 1, nullable: true }
 *
 *     UpdateFieldRequest:
 *       type: object
 *       additionalProperties: false
 *       description: Partial update of a field. Only provided keys are changed.
 *       properties:
 *         name:        { type: string, minLength: 2, maxLength: 100 }
 *         address:     { type: string, maxLength: 255, nullable: true }
 *         description: { type: string, maxLength: 1000, nullable: true }
 *         capacity:    { type: integer, minimum: 1, nullable: true }
 *
 *     CreateLeagueRequest:
 *       type: object
 *       required: [name, fieldIds]
 *       properties:
 *         name:        { type: string, minLength: 2, maxLength: 100 }
 *         description: { type: string, maxLength: 1000, nullable: true }
 *         season:      { type: string, maxLength: 50, nullable: true }
 *         startDate:   { type: string, format: date, nullable: true }
 *         endDate:     { type: string, format: date, nullable: true }
 *         fieldIds:
 *           type: array
 *           minItems: 1
 *           items: { type: string, format: uuid }
 *
 *     UpdateLeagueRequest:
 *       type: object
 *       additionalProperties: false
 *       description: |
 *         Partial update. When `fieldIds` is provided it **replaces** the league's
 *         associated fields (empty array removes all). `startDate` must be `<= endDate`
 *         when both are set.
 *       properties:
 *         name:        { type: string, minLength: 2, maxLength: 100 }
 *         description: { type: string, maxLength: 1000, nullable: true }
 *         season:      { type: string, maxLength: 50, nullable: true }
 *         startDate:   { type: string, format: date, nullable: true }
 *         endDate:     { type: string, format: date, nullable: true }
 *         fieldIds:
 *           type: array
 *           minItems: 1
 *           items: { type: string, format: uuid }
 */
export {};
