entity test_entity is
  type PART;                            -- Incomplete type declarations.
  type WIRE;
  type PART_PTR is access PART;
  type WIRE_PTR is access WIRE;
  
  type PART is record
    CONNECTIONS : WIRE_PTR;
  end record;
  type WIRE is record
    CONNECTS  : PART_PTR;
  end record;
begin
end entity;
