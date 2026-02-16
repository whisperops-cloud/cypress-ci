describe('template spec', () => {
  it('passes', () => {
    cy.visit('http://localhost:3000/')
    cy.get('[name="username"]').type('Usertest')
    cy.get('[name="password"]').type('1234')
    cy.get('button').click()
  })
})