from enum import Enum,IntEnum


class Grade(str,Enum):
    FRESHMAN = 'Freshman',
    SOPHOMORE = 'Sophomore',
    JUNIOR = 'Junior',
    SENIOR = 'Senior',
    GRADUATE = 'Graduate',
    ALUMNI = 'Alumni'
