-- related to file hack
library ieee;
use ieee.Textio.line;
use ieee.Textio.text;

package standard is
  type boolean is (false, true);
  type bit is ('0', '1');
  function RISING_EDGE (signal S  : bit) return boolean;
  function FALLING_EDGE (signal S : bit) return boolean;
  type character is (NUL, SOH, STX, ETX, EOT, ENQ, ACK, BEL, BS, HT, LF, VT, FF, CR, SO, SI, DLE, DC1, DC2, DC3, DC4, NAK, SYN, ETB, CAN, EM, SUB, ESC, FSP, GSP, RSP, USP, ' ', '!', '"',     '#',     '$',     '%',     '&',     ''',   '(',   ')',   '*',   '+',   ',',   '-',   '.',   '/',   '0',   '1',   '2',   '3',   '4',   '5',   '6',   '7',   '8',   '9',   ':',   ';',   '<',   '=',   '>',   '?',   '@',   'A',   'B',   'C',   'D',   'E',   'F',   'G',   'H',   'I',   'J',   'K',   'L',   'M',   'N',   'O',   'P',   'Q',   'R',   'S',   'T',   'U',   'V',   'W',   'X',   'Y',   'Z',   '[',   '\',   ']',   '^',   '_',   '`',   'a',   'b',   'c',   'd',   'e',   'f',   'g',   'h',   'i',   'j',   'k',   'l',   'm',   'n',   'o',   'p',   'q',   'r',   's',   't',   'u',   'v',   'w',   'x',   'y',   'z',   '{',   '|',   '}',   '~',   DEL,   C128,   C129,   C130,   C131,   C132,   C133,   C134,   C135,   C136,   C137,   C138,   C139,   C140,   C141,   C142,   C143,   C144,   C145,   C146,   C147,   C148,   C149,   C150,   C151,   C152,   C153,   C154,   C155,   C156,   C157,   C158,   C159,   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�',   '�');
  type severity_level is (note, warning, error, failure);
  type UNIVERSAL_INTEGER is range -9223372036854775808 to 9223372036854775807;
  type UNIVERSAL_REAL is range -1.79769313486232E+308 to 1.79769313486232E+308;
  type integer is range -2147483648 to 2147483647;
  type real is range -1.79769313486232E+308 to 1.79769313486232E+308;
  type time is range -9223372036854775808 fs to 9223372036854775807 fs units
                                                                         fs;
                                                                         ps = 1000 fs;
                                                                         ns = 1000 ps;
                                                                         us = 1000 ns;
                                                                         ms = 1000 us;
                                                                         sec = 1000 ms;
                                                                         min = 60 sec;
                                                                         hr = 60 min;
                                                                       end units;
  subtype delay_length is time range 0 fs to 9223372036854775807 fs;
  function now return delay_length;
  subtype natural is integer range 0 to 2147483647;
  subtype positive is integer range 1 to 2147483647;
  type string is array (positive range <>) of character;
  type boolean_vector is array (natural range <>) of boolean;
  type bit_vector is array (natural range <>) of bit;
    function MINIMUM (L, R     : bit_vector) return bit_vector;
  function MAXIMUM (L, R     : bit_vector) return bit_vector;
--
--function MINIMUM (L: BIT_VECTOR) return BIT;
  function MAXIMUM (L        : bit_vector) return bit;
  function TO_STRING (VALUE  : bit_vector) return string;
  alias TO_BSTRING is TO_STRING [bit_vector return string];
  function TO_HSTRING (VALUE : bit_vector) return string;
  function TO_OSTRING (VALUE : bit_vector) return string;


  type integer_vector is array (natural range <>) of integer;
  type real_vector is array (natural range <>) of real;
  type time_vector is array (natural range <>) of time;
  type file_open_kind is (read_mode, write_mode, append_mode);
  type file_open_status is (open_ok, status_error, name_error, mode_error);
  attribute foreign : string;

  -- this is a hack!
  type FT is file of TM; -- vhdl-linter-disable-line not-declared
  function ENDFILE (file F     : FT) return boolean;
  procedure FLUSH (file F      : FT);
  procedure WRITE (file F      : FT; VALUE : in text);
  procedure READ (file F       : FT; VALUE : out text);
  procedure FILE_CLOSE (file F : FT);
  procedure FILE_OPEN (Status        : out file_open_status;
                       file F        :     FT;
                       External_Name : in  string;
                       Open_Kind     : in  file_open_kind := read_mode);
  procedure FILE_OPEN (file F        :    FT;
                       External_Name : in string;
                       Open_Kind     : in file_open_kind := read_mode);

-- This is a dummy declaration for predefined attributes according to LRM 16.2
-- vhdl-linter-disable not-declared

  -- 16.2.2 Predefined attributes of types and objects
  attribute base          : t;
  attribute left          : t;
  attribute right         : t;
  attribute high          : t;
  attribute low           : t;
  attribute ascending     : t;
  attribute image         : t;
  attribute value         : t;
  attribute pos           : t;
  attribute val           : t;
  attribute succ          : t;
  attribute pred          : t;
  attribute leftof        : t;
  attribute rightof       : t;
  attribute subtype       : t;
-- 16.2.3 Predefined attributes of arrays
  -- attribute left          : t;
  -- attribute right         : t;
  -- attribute high          : t;
  -- attribute low           : t;
  attribute range         : t;
  attribute reverse_range : t;
  attribute length        : t;
  -- attribute ascending     : t;
  attribute element       : t;
-- 16.2.4 Predefined attributes of signals
  attribute delayed       : t;
  attribute stable       : t;
  attribute quiet       : t;
  attribute transaction       : t;
  attribute event       : t;
  attribute active       : t;
  attribute last_event       : t;
  attribute last_active       : t;
  attribute last_value       : t;
  attribute driving       : t;
  attribute driving_value       : t;
  -- 16.2.5 Predefined attributes of named entities
  attribute simple_name       : t;
  attribute instance_name       : t;
  attribute path_name       : t;



    -- Predefined TO_STRING operations on scalar types
  function TO_STRING (VALUE: BOOLEAN) return STRING;
  function TO_STRING (VALUE: BIT) return STRING;
  function TO_STRING (VALUE: CHARACTER) return STRING;
  function TO_STRING (VALUE: SEVERITY_LEVEL) return STRING;
  function TO_STRING (VALUE: universal_integer) return STRING;
  function TO_STRING (VALUE: universal_real) return STRING;
  function TO_STRING (VALUE: INTEGER) return STRING;
  function TO_STRING (VALUE: REAL) return STRING;
  function TO_STRING (VALUE: TIME) return STRING;
  function TO_STRING (VALUE: STRING) return STRING;
  function TO_STRING (VALUE: BOOLEAN_VECTOR) return STRING;
  function TO_STRING (VALUE: INTEGER_VECTOR) return STRING;
  function TO_STRING (VALUE: REAL_VECTOR) return STRING;
  function TO_STRING (VALUE: TIME_VECTOR) return STRING;
  function TO_STRING (VALUE: FILE_OPEN_KIND) return STRING;
  function TO_STRING (VALUE: FILE_OPEN_STATUS) return STRING;
  -- Predefined overloaded TO_STRING operations
  function TO_STRING (VALUE: REAL; DIGITS: NATURAL) return STRING;
  function TO_STRING (VALUE: REAL; FORMAT: STRING) return STRING;
  function TO_STRING (VALUE: TIME; UNIT: TIME) return STRING;

end;
