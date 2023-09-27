-- Test more complex record structures:
-- 1. Nested records
-- 2. Self referencing records (using incomplete record type)

use std.textio.all;
package test_selected_name is
end package;
package body test_selected_name is
  type MessageStructType;               -- test of incomplete record type
  type MessageStructPtrType is access MessageStructType;
  type MessageStructType is record
    Name    : line;
    NextPtr : MessageStructPtrType;
  end record MessageStructType;
  type CovStructType is record
    CovMessage : MessageStructPtrType;
  end record CovStructType;
  type ItemArrayType is array (integer range <>) of CovStructType;


  impure function GetNamePlus(ID : integer) return string is
    ------------------------------------------------------------
    type ItemArrayPtrType is access ItemArrayType;
    variable Template : ItemArrayType(1 to 1) := (1 => (CovMessage => null)); -- vhdl-linter-disable-line unused

    variable CovStructPtr : ItemArrayPtrType := new ItemArrayType'(Template);  -- vhdl-linter-disable-line unused

  begin
    return CovStructPtr(ID).CovMessage.Name.all;
  end function GetNamePlus;

  impure function GetNamePlus return string is
    ------------------------------------------------------------


    variable Cov : CovStructType;       -- vhdl-linter-disable-line unused

  begin
    return Cov.CovMessage.Name.all;
  end function GetNamePlus;
end package body;
