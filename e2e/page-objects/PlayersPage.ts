import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Players Page Object
 *
 * Represents the players management page
 */
export class PlayersPage extends BasePage {
  // Locators
  readonly pageTitle: Locator;
  readonly addPlayerButton: Locator;
  readonly playersTable: Locator;
  readonly activePlayersSection: Locator;
  readonly inactivePlayersSection: Locator;

  // Dialog locators
  readonly playerDialog: Locator;
  readonly nameInput: Locator;
  readonly nicknameInput: Locator;
  readonly photoUrlInput: Locator;
  readonly saveButton: Locator;
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.getByRole('heading', { name: 'Player Management' });
    this.addPlayerButton = page.getByRole('button', { name: /add player/i });
    this.playersTable = page.locator('table');
    this.activePlayersSection = page.locator('text=Active Players').locator('..');
    this.inactivePlayersSection = page.locator('text=Inactive Players').locator('..');

    // Dialog elements
    this.playerDialog = page.locator('[role="dialog"]');
    this.nameInput = page.getByLabel(/full name/i);
    this.nicknameInput = page.getByLabel(/nickname/i);
    this.photoUrlInput = page.getByLabel(/photo url/i);
    this.saveButton = page.getByRole('button', { name: /save player/i });
    this.deleteDialog = page.locator('[role="alertdialog"]');
    this.confirmDeleteButton = page.getByRole('button', { name: /delete/i }).last();
  }

  /**
   * Navigate to players page
   */
  async navigate(): Promise<void> {
    await this.goto('/players');
    await this.waitForPageLoad();
  }

  /**
   * Click Add Player button
   */
  async clickAddPlayer(): Promise<void> {
    await this.addPlayerButton.click();
    await this.playerDialog.waitFor({ state: 'visible' });
  }

  /**
   * Fill player form
   */
  async fillPlayerForm(name: string, nickname: string, photoUrl?: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.nicknameInput.fill(nickname);
    if (photoUrl) {
      await this.photoUrlInput.fill(photoUrl);
    }
  }

  /**
   * Save player
   */
  async savePlayer(): Promise<void> {
    await this.saveButton.click();
    await this.playerDialog.waitFor({ state: 'hidden', timeout: 10000 });
  }

  /**
   * Create a new player
   */
  async createPlayer(name: string, nickname: string, photoUrl?: string): Promise<void> {
    await this.clickAddPlayer();
    await this.fillPlayerForm(name, nickname, photoUrl);
    await this.savePlayer();
  }

  /**
   * Find player in table by name
   */
  async findPlayerByName(name: string): Promise<Locator | null> {
    const playerRow = this.page.locator(`tr:has-text("${name}")`);
    const isVisible = await playerRow.isVisible().catch(() => false);
    return isVisible ? playerRow : null;
  }

  /**
   * Get player balance
   */
  async getPlayerBalance(playerName: string): Promise<string | null> {
    const playerRow = await this.findPlayerByName(playerName);
    if (!playerRow) return null;

    const balanceCell = playerRow.locator('td').last();
    return balanceCell.textContent();
  }

  /**
   * Edit player
   */
  async editPlayer(playerName: string): Promise<void> {
    const playerRow = await this.findPlayerByName(playerName);
    if (!playerRow) throw new Error(`Player ${playerName} not found`);

    const editButton = playerRow.getByRole('button', { name: /edit/i });
    await editButton.click();
    await this.playerDialog.waitFor({ state: 'visible' });
  }

  /**
   * Delete player
   */
  async deletePlayer(playerName: string): Promise<void> {
    const playerRow = await this.findPlayerByName(playerName);
    if (!playerRow) throw new Error(`Player ${playerName} not found`);

    const deleteButton = playerRow.getByRole('button', { name: /delete/i });
    await deleteButton.click();
    await this.deleteDialog.waitFor({ state: 'visible' });
    await this.confirmDeleteButton.click();
    await this.deleteDialog.waitFor({ state: 'hidden', timeout: 10000 });
  }

  /**
   * Set player active/inactive
   */
  async setPlayerActive(playerName: string, active: boolean): Promise<void> {
    const playerRow = await this.findPlayerByName(playerName);
    if (!playerRow) throw new Error(`Player ${playerName} not found`);

    const buttonName = active ? /set active/i : /set inactive/i;
    const statusButton = playerRow.getByRole('button', { name: buttonName });
    await statusButton.click();
  }

  /**
   * Get number of active players
   */
  async getActivePlayersCount(): Promise<number> {
    return this.activePlayersSection.locator('tbody tr').count();
  }

  /**
   * Get number of inactive players
   */
  async getInactivePlayersCount(): Promise<number> {
    return this.inactivePlayersSection.locator('tbody tr').count();
  }

  /**
   * Navigate to player detail page
   */
  async navigateToPlayerDetail(playerName: string): Promise<void> {
    const playerRow = await this.findPlayerByName(playerName);
    if (!playerRow) throw new Error(`Player ${playerName} not found`);

    const playerLink = playerRow.locator('a').first();
    await playerLink.click();
    await this.waitForNavigation();
  }
}
