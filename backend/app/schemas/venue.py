from pydantic import BaseModel, Field

class VenueSettingsOut(BaseModel):
    id: int
    name: str
    timezone: str
    currency: str
    seats_total: int
    tables_count: int
    mode: str

    class Config:
        from_attributes = True

class VenueSettingsUpdate(BaseModel):
    name: str = Field(default="My Venue")
    timezone: str = Field(default="Europe/Prague")
    currency: str = Field(default="CZK")
    seats_total: int = Field(default=40, ge=1)
    tables_count: int = Field(default=10, ge=0)
    mode: str = Field(default="dinein")