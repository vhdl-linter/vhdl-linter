entity test_entity is
begin
  type PART; -- Incomplete type declarations.
  type WIRE;
  type PART_PTR is access PART;
  type WIRE_PTR is access WIRE;
  type PART_LIST is array (positive range <>) of PART_PTR;
  type WIRE_LIST is array (positive range <>) of WIRE_PTR;
  type PART_LIST_PTR is access PART_LIST;
  type WIRE_LIST_PTR is access WIRE_LIST;
  type PART is record
    PART_NAME   : string (1 to MAX_STRING_LEN);
    CONNECTIONS : WIRE_LIST_PTR;
  end record;
  type WIRE is record
    WIRE_NAME : string (1 to MAX_STRING_LEN);
    CONNECTS  : PART_LIST_PTR;
  end record;
end entity;
