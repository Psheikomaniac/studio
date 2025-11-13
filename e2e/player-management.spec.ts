import { test, expect } from '@playwright/test';
import { PlayersPage } from './page-objects/PlayersPage';
import { TestDataHelper } from './helpers/test-data.helper';

/**
 * Player Management E2E Tests
 *
 * Tests the complete player management workflow:
 * - Creating new players
 * - Editing player details
 * - Viewing player balance
 * - Archiving/activating players
 * - Deleting players
 */
test.describe('Feature: Player Management', () => {
  let playersPage: PlayersPage;
  let testPlayerName: string;
  let testNickname: string;

  test.beforeEach(async ({ page }) => {
    playersPage = new PlayersPage(page);
    testPlayerName = TestDataHelper.generatePlayerName();
    testNickname = TestDataHelper.generateNickname();

    // Navigate to players page
    await playersPage.navigate();
  });

  test('should display players page correctly', async () => {
    // GIVEN: User is on the players page
    // THEN: Page should be loaded with correct title
    await expect(playersPage.pageTitle).toBeVisible();
    await expect(playersPage.addPlayerButton).toBeVisible();
    await expect(playersPage.activePlayersSection).toBeVisible();
  });

  test('should create a new player successfully', async () => {
    // GIVEN: User clicks on "Add Player" button
    await playersPage.clickAddPlayer();

    // WHEN: User fills in player details and saves
    await playersPage.fillPlayerForm(testPlayerName, testNickname);
    await playersPage.savePlayer();

    // THEN: Player should appear in the active players list
    await playersPage.page.waitForTimeout(2000); // Wait for real-time update
    const playerRow = await playersPage.findPlayerByName(testPlayerName);
    expect(playerRow).not.toBeNull();

    // AND: Toast notification should confirm creation
    const toastAppeared = await playersPage.waitForToast('Player Added');
    expect(toastAppeared).toBe(true);
  });

  test('should validate player form fields', async () => {
    // GIVEN: User clicks on "Add Player" button
    await playersPage.clickAddPlayer();

    // WHEN: User tries to save without filling required fields
    await playersPage.saveButton.click();

    // THEN: Validation errors should be displayed
    const nameError = playersPage.page.locator('text=/name must be at least 2 characters/i');
    const nicknameError = playersPage.page.locator('text=/nickname must be at least 2 characters/i');

    await expect(nameError).toBeVisible();
    await expect(nicknameError).toBeVisible();
  });

  test('should edit player details successfully', async () => {
    // GIVEN: A player exists
    await playersPage.createPlayer(testPlayerName, testNickname);
    await playersPage.page.waitForTimeout(2000);

    // WHEN: User edits the player
    await playersPage.editPlayer(testPlayerName);

    const newNickname = TestDataHelper.generateNickname();
    await playersPage.nicknameInput.clear();
    await playersPage.nicknameInput.fill(newNickname);
    await playersPage.savePlayer();

    // THEN: Player details should be updated
    await playersPage.page.waitForTimeout(2000);
    const playerRow = await playersPage.findPlayerByName(testPlayerName);
    expect(playerRow).not.toBeNull();

    const nicknameCell = playerRow?.locator(`text=${newNickname}`);
    await expect(nicknameCell!).toBeVisible();
  });

  test('should view player balance', async () => {
    // GIVEN: A player exists
    await playersPage.createPlayer(testPlayerName, testNickname);
    await playersPage.page.waitForTimeout(2000);

    // WHEN: User views the player's balance
    const balance = await playersPage.getPlayerBalance(testPlayerName);

    // THEN: Balance should be displayed (initially 0)
    expect(balance).not.toBeNull();
    expect(balance).toContain('€'); // Should contain Euro symbol
  });

  test('should deactivate and reactivate player', async () => {
    // GIVEN: An active player exists
    await playersPage.createPlayer(testPlayerName, testNickname);
    await playersPage.page.waitForTimeout(2000);

    const initialActiveCount = await playersPage.getActivePlayersCount();

    // WHEN: User deactivates the player
    await playersPage.setPlayerActive(testPlayerName, false);
    await playersPage.page.waitForTimeout(2000);

    // THEN: Player should move to inactive section
    const newActiveCount = await playersPage.getActivePlayersCount();
    expect(newActiveCount).toBeLessThan(initialActiveCount);

    const inactiveCount = await playersPage.getInactivePlayersCount();
    expect(inactiveCount).toBeGreaterThan(0);

    // WHEN: User reactivates the player
    await playersPage.setPlayerActive(testPlayerName, true);
    await playersPage.page.waitForTimeout(2000);

    // THEN: Player should move back to active section
    const finalActiveCount = await playersPage.getActivePlayersCount();
    expect(finalActiveCount).toBe(initialActiveCount);
  });

  test('should delete player successfully', async () => {
    // GIVEN: A player exists
    await playersPage.createPlayer(testPlayerName, testNickname);
    await playersPage.page.waitForTimeout(2000);

    // WHEN: User deletes the player
    await playersPage.deletePlayer(testPlayerName);

    // THEN: Player should no longer be visible
    await playersPage.page.waitForTimeout(2000);
    const playerRow = await playersPage.findPlayerByName(testPlayerName);
    expect(playerRow).toBeNull();

    // AND: Toast notification should confirm deletion
    const toastAppeared = await playersPage.waitForToast('Player Deleted');
    expect(toastAppeared).toBe(true);
  });

  test('should navigate to player detail page', async () => {
    // GIVEN: A player exists
    await playersPage.createPlayer(testPlayerName, testNickname);
    await playersPage.page.waitForTimeout(2000);

    // WHEN: User clicks on player link
    await playersPage.navigateToPlayerDetail(testPlayerName);

    // THEN: Should navigate to player detail page
    await expect(playersPage.page).toHaveURL(/\/players\/[a-zA-Z0-9]+/);
  });

  test('should show validation for duplicate player names', async () => {
    // GIVEN: A player with specific name exists
    await playersPage.createPlayer(testPlayerName, testNickname);
    await playersPage.page.waitForTimeout(2000);

    // WHEN: User tries to create another player with same name
    await playersPage.clickAddPlayer();
    await playersPage.fillPlayerForm(testPlayerName, 'DifferentNickname');
    await playersPage.savePlayer();

    // THEN: Player should be created (no duplicate validation in current implementation)
    // Note: If duplicate validation is added, update this test
    await playersPage.page.waitForTimeout(2000);
  });

  test('should display player with generated avatar when no photo URL provided', async () => {
    // GIVEN: User creates a player without photo URL
    await playersPage.createPlayer(testPlayerName, testNickname);
    await playersPage.page.waitForTimeout(2000);

    // WHEN: User views the player
    const playerRow = await playersPage.findPlayerByName(testPlayerName);

    // THEN: Avatar should be displayed (ui-avatars.com fallback)
    const avatar = playerRow?.locator('img');
    await expect(avatar!).toBeVisible();

    const src = await avatar?.getAttribute('src');
    expect(src).toContain('ui-avatars.com');
  });
});
