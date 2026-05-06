import asyncio
from database import engine
from models import *

async def reset_db():
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: sync_conn.drop_all())
        print('Wait')

if __name__ == '__main__':
    asyncio.run(reset_db())
