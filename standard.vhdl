-- The sven STANDARD package.
-- This design unit contains some special tokens, which are only
-- recognized by the analyzer when it is in special "bootstrap" mode.

package STANDARD is

  -- predefined enumeration types:

  type BOOLEAN is (FALSE, TRUE);

  type BIT is ('0', '1');

  type CHARACTER is ();



  type SEVERITY_LEVEL is (NOTE, WARNING, ERROR, FAILURE);

  -- predefined numeric types:

  -- Do INTEGER first to aid implicit declarations of "**".
  type INTEGER is range -2147483647 to 2147483647;

  function "*" ($LEFT: $UNIVERSAL_REAL; $RIGHT: $UNIVERSAL_INTEGER)
	return $UNIVERSAL_REAL;

  function "*" ($LEFT: $UNIVERSAL_INTEGER; $RIGHT: $UNIVERSAL_REAL)
	return $UNIVERSAL_REAL;

  function "/" ($LEFT: $UNIVERSAL_REAL; $RIGHT: $UNIVERSAL_INTEGER)
	return $UNIVERSAL_REAL;

  type REAL is range $-. to $+.;

  -- predefined type TIME:

type Time is range --implementation defined-- ;
  units
     fs;            -- femtosecond
     ps  = 1000 fs; -- picosecond
     ns  = 1000 ps; -- nanosecond
     us  = 1000 ns; -- microsecond
     ms  = 1000 us; -- millisecond
     sec = 1000 ms; -- second
     min = 60  sec; -- minute
     hr  = 60  min; -- hour
  end units;
  -- subtype used internally for checking time expressions for non-negativness:


  subtype DELAY_LENGTH is TIME range 0 fs to TIME'HIGH;

  -- function that returns the current simulation time:

  impure function NOW return TIME;

  -- predefined numeric subtypes:

  subtype NATURAL is INTEGER range 0 to INTEGER'HIGH;

  subtype POSITIVE is INTEGER range 1 to INTEGER'HIGH;

  -- predefined array types:

  type STRING is array (POSITIVE range <>) of CHARACTER;

  type BIT_VECTOR is array (NATURAL range <>) of BIT;

--type FILE_OPEN_KIND is (READ_OPEN, WRITE_OPEN, APPEND_OPEN);

  type FILE_OPEN_KIND is (READ_MODE, WRITE_MODE, APPEND_MODE);

  type FILE_OPEN_STATUS is (OPEN_OK, STATUS_ERROR, NAME_ERROR, MODE_ERROR);

  attribute FOREIGN: STRING;

end STANDARD;
