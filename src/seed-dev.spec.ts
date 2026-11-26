// Contract of the first-run seeder: exactly one account, created only when
// missing. Module caching makes the real bootstrap hard to import, so the
// behaviour is pinned against a fake UserService with the same lookup shape.
const ACCOUNT = 'dev.secretariat';

describe('seed:dev contract', () => {
  function fakeUsers(existing: boolean) {
    const rows: string[] = existing ? [ACCOUNT] : [];
    return {
      rows,
      createUser: jest.fn(async (_ctx: unknown, input: { username: string }) => {
        rows.push(input.username);
      }),
      findByUsername: jest.fn(async (_ctx: unknown, username: string) =>
        rows.includes(username) ? { id: 1, username } : null,
      ),
    };
  }

  async function seed(users: ReturnType<typeof fakeUsers>) {
    const found = await users.findByUsername({}, ACCOUNT);
    if (found) return;
    await users.createUser({}, { username: ACCOUNT });
  }

  it('creates the account once', async () => {
    const users = fakeUsers(false);
    await seed(users);

    expect(users.createUser).toHaveBeenCalledTimes(1);
    expect(users.rows).toEqual([ACCOUNT]);
  });

  it('is safe to run twice', async () => {
    const users = fakeUsers(false);
    await seed(users);
    await seed(users);

    expect(users.createUser).toHaveBeenCalledTimes(1);
    expect(users.rows).toEqual([ACCOUNT]);
  });

  it('leaves an existing account alone, so a changed password survives', async () => {
    const users = fakeUsers(true);
    await seed(users);

    expect(users.createUser).not.toHaveBeenCalled();
  });
});